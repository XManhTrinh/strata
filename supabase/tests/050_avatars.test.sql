-- Profile photos: owners upload into their own folder only; co-members can see them, strangers can't.
begin;
\ir _helpers.psql

select plan(6);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob')),
  ('carol', tests.create_user('carol@other.test', 'Carol'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'team', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();
insert into public.members (workspace_id, user_id, full_name, email)
select id, (select user_id from people where name = 'bob'), 'Bob', 'bob@acme.test'
from public.workspaces where slug = 'acme';

select tests.authenticate_as((select user_id from people where name = 'alice'));

select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('avatars', '%s/photo.png') $$,
         (select user_id from people where name = 'alice')),
  'users can upload into their own avatar folder'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('avatars', '%s/photo.png') $$,
         (select user_id from people where name = 'bob')),
  '42501', null, 'users cannot upload into someone else''s folder'
);
select lives_ok(
  format($$ update public.profiles set avatar_path = '%s/photo.png' where id = auth.uid() $$,
         (select user_id from people where name = 'alice')),
  'a profile can point at a photo in its own folder'
);
select throws_ok(
  format($$ update public.profiles set avatar_path = '%s/photo.png' where id = auth.uid() $$,
         (select user_id from people where name = 'bob')),
  '23514', null, 'a profile cannot point at someone else''s photo'
);

select tests.authenticate_as((select user_id from people where name = 'bob'));
select is(
  (select count(*)::int from storage.objects where bucket_id = 'avatars'), 1,
  'co-members can see each other''s photos'
);
select tests.authenticate_as((select user_id from people where name = 'carol'));
select is(
  (select count(*)::int from storage.objects where bucket_id = 'avatars'), 0,
  'strangers cannot see photos of people they share no workspace with'
);

-- Deleting goes through the Storage API (Supabase blocks direct SQL deletes on storage tables);
-- the delete policy above is exercised by the app's end-to-end test.

select * from finish();
rollback;
