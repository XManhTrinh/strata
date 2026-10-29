-- Invitations: who may invite with which role, the token, accepting, and its safeguards.
begin;
\ir _helpers.psql

select plan(19);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated, anon;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('erin', tests.create_user('erin@acme.test', 'Erin')),
  ('mallory', tests.create_user('mallory@evil.test', 'Mallory'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');

create temporary table ctx on commit drop as
select w.id as ws,
  (select id from public.roles where workspace_id = w.id and name = 'Member') as member_role,
  (select id from public.roles where workspace_id = w.id and name = 'Admin') as admin_role
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated;

create temporary table tokens (name text primary key, token text, invitation_id uuid) on commit drop;
grant select, insert, update on tokens to authenticated;
grant select on tokens to anon;

insert into tokens
select 'erin', token, invitation_id from public.create_invitation((select ws from ctx), 'Erin@Acme.test', (select member_role from ctx));

select ok((select length(token) = 64 from tokens where name = 'erin'), 'a 64-character secret token is returned once');
select tests.clear_authentication();
select ok(
  (select token_hash = sha256(convert_to((select token from tokens where name = 'erin'), 'UTF8'))
   from public.invitations where id = (select invitation_id from tokens where name = 'erin')),
  'only a SHA-256 hash of the token is stored'
);
select tests.authenticate_as((select user_id from people where name = 'alice'));
select throws_ok(
  $$ select token_hash from public.invitations $$,
  '42501', null, 'the token hash is not readable through the API'
);
select throws_ok(
  $$ select * from public.create_invitation((select ws from ctx), 'erin@acme.test', (select member_role from ctx)) $$,
  '23505', null, 'an email with an open invitation cannot be invited twice (emails compare case-insensitively)'
);
select throws_ok(
  $$ select * from public.create_invitation((select ws from ctx), 'alice@acme.test', (select member_role from ctx)) $$,
  '23505', null, 'existing members cannot be invited'
);

-- Erin was already notified in-app, because she has an account.
select tests.authenticate_as((select user_id from people where name = 'erin'));
select is((select kind from public.notifications), 'invitation.received', 'invitees with an account get an in-app notification');

-- The invitation page works before sign-in.
select tests.authenticate_as_anon();
select is(
  (select workspace_name || '/' || role_name || '/' || status from public.get_invitation((select token from tokens where name = 'erin'))),
  'Acme/Member/open',
  'anyone with the link can see what it is an invitation to'
);
select is_empty($$ select * from public.get_invitation('not-a-token') $$, 'unknown tokens reveal nothing');
select throws_ok(
  $$ select public.accept_invitation((select token from tokens where name = 'erin')) $$,
  '42501', null, 'accepting requires signing in'
);

-- A forwarded link cannot be used by someone else.
select tests.authenticate_as((select user_id from people where name = 'mallory'));
select throws_ok(
  $$ select public.accept_invitation((select token from tokens where name = 'erin')) $$,
  '42501', null, 'only the invited email address can accept'
);

select tests.authenticate_as((select user_id from people where name = 'erin'));
select is(public.accept_invitation((select token from tokens where name = 'erin')), 'acme',
  'the invitee joins and gets the workspace address');
select ok(
  exists (
    select 1 from public.member_roles mr join public.members m on m.id = mr.member_id
    where m.user_id = auth.uid() and mr.role_id = (select member_role from ctx)
  ),
  'the invitee has the invited role'
);
select throws_ok(
  $$ select public.accept_invitation((select token from tokens where name = 'erin')) $$,
  '23514', null, 'an invitation cannot be used twice'
);

-- Imported people without an account are linked, not duplicated.
select tests.clear_authentication();
insert into public.members (workspace_id, full_name, email, person_key)
values ((select ws from ctx), 'Frank Imported', 'frank@acme.test', 'E-1001');
insert into people values ('frank', tests.create_user('frank@acme.test', 'Frank'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
insert into tokens
select 'frank', token, invitation_id from public.create_invitation((select ws from ctx), 'frank@acme.test', (select member_role from ctx));

select tests.authenticate_as((select user_id from people where name = 'frank'));
select public.accept_invitation((select token from tokens where name = 'frank'));
select tests.clear_authentication();
select is(
  (select count(*)::int || ':' || max(person_key) from public.members where email = 'frank@acme.test'),
  '1:E-1001',
  'an imported member is linked to the new account instead of duplicated'
);

-- Revoked and expired invitations are refused; resending issues a fresh link.
select tests.authenticate_as((select user_id from people where name = 'alice'));
insert into tokens
select 'gina', token, invitation_id from public.create_invitation((select ws from ctx), 'gina@acme.test', (select member_role from ctx));
select public.revoke_invitation((select invitation_id from tokens where name = 'gina'));
select is(
  (select status from public.get_invitation((select token from tokens where name = 'gina'))),
  'revoked', 'revoked invitations show as withdrawn'
);

insert into tokens
select 'hal', token, invitation_id from public.create_invitation((select ws from ctx), 'hal@acme.test', (select member_role from ctx));
select tests.clear_authentication();
update public.invitations set expires_at = now() - interval '1 minute'
where id = (select invitation_id from tokens where name = 'hal');
select is(
  (select status from public.get_invitation((select token from tokens where name = 'hal'))),
  'expired', 'invitations expire'
);

select tests.authenticate_as((select user_id from people where name = 'alice'));
update tokens set token = public.resend_invitation(invitation_id) where name = 'hal';
select is(
  (select status from public.get_invitation((select token from tokens where name = 'hal'))),
  'open', 'resending gives a fresh, valid link'
);

-- Members without members.invite cannot invite; inviters cannot hand out more than they hold.
select tests.clear_authentication();
select tests.authenticate_as((select user_id from people where name = 'erin'));
select throws_ok(
  $$ select * from public.create_invitation((select ws from ctx), 'x@acme.test', (select member_role from ctx)) $$,
  '42501', null, 'members without members.invite cannot invite'
);

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.assign_role((select ws from ctx),
  (select id from public.members where user_id = (select user_id from people where name = 'erin')),
  (select id from public.roles where workspace_id = (select ws from ctx) and name = 'HR'));
select tests.authenticate_as((select user_id from people where name = 'erin'));
select throws_ok(
  $$ select * from public.create_invitation((select ws from ctx), 'x@acme.test', (select admin_role from ctx)) $$,
  '42501', null, 'inviters cannot invite with roles holding more than they have'
);

select * from finish();
rollback;
