-- Workspace logos: settings managers upload into their workspace's folder only; members see the
-- logo, others don't; a workspace points only at a logo in its own folder.
begin;
\ir _helpers.psql

select plan(7);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob')),
  ('carol', tests.create_user('carol@other.test', 'Carol'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'team', 'GB', 'Europe/London', 'GBP');
select tests.authenticate_as((select user_id from people where name = 'carol'));
select public.create_workspace('Other', 'other', 'team', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();
insert into public.members (workspace_id, user_id, full_name, email)
select id, (select user_id from people where name = 'bob'), 'Bob', 'bob@acme.test'
from public.workspaces where slug = 'acme';
insert into public.member_roles (workspace_id, member_id, role_id)
select w.id, m.id, r.id from public.workspaces w
join public.members m on m.workspace_id = w.id and m.full_name = 'Bob'
join public.roles r on r.workspace_id = w.id and r.name = 'Member'
where w.slug = 'acme';

create temporary table ctx on commit drop as
select (select id from public.workspaces where slug = 'acme') as acme, (select id from public.workspaces where slug = 'other') as other;
grant select on ctx to authenticated;

select tests.authenticate_as((select user_id from people where name = 'alice'));
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('workspace-logos', '%s/logo.webp') $$, (select acme from ctx)),
  'an owner uploads into their workspace''s logo folder'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('workspace-logos', '%s/logo.webp') $$, (select other from ctx)),
  '42501', null, 'but not into another workspace''s'
);
select lives_ok(
  format($$ update public.workspaces set logo_path = '%s/logo.webp' where id = %L $$, (select acme from ctx), (select acme from ctx)),
  'the workspace points at its logo'
);
select throws_ok(
  format($$ update public.workspaces set logo_path = '%s/logo.webp' where id = %L $$, (select other from ctx), (select acme from ctx)),
  '23514', null, 'and only at a logo in its own folder'
);

select tests.authenticate_as((select user_id from people where name = 'bob'));
select is((select count(*)::int from storage.objects where bucket_id = 'workspace-logos'), 1, 'members see their workspace''s logo');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('workspace-logos', '%s/mine.webp') $$, (select acme from ctx)),
  '42501', null, 'members without settings rights cannot upload one'
);
select tests.authenticate_as((select user_id from people where name = 'carol'));
select is((select count(*)::int from storage.objects where bucket_id = 'workspace-logos'), 0, 'others do not see it');

select * from finish();
rollback;
