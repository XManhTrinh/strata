-- Workspaces, members, roles and features: creation from a template, isolation between
-- workspaces, permissions by role, escalation guards, the Admin role, features and owners.
begin;
\ir _helpers.psql

select plan(45);

-- People ------------------------------------------------------------------------------------------

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;

insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice Owner')),
  ('bob',   tests.create_user('bob@acme.test', 'Bob Member')),
  ('carol', tests.create_user('carol@acme.test', 'Carol HR')),
  ('dave',  tests.create_user('dave@other.test', 'Dave Stranger'));

select is(
  (select full_name from public.profiles where id = (select user_id from people where name = 'alice')),
  'Alice Owner',
  'a profile is created with the account'
);

-- Creating a workspace ----------------------------------------------------------------------------

select tests.authenticate_as((select user_id from people where name = 'alice'));

select lives_ok(
  $$ select public.create_workspace('Acme', 'acme', 'company', 'gb', 'Europe/London', 'gbp', 4::smallint, 1::smallint) $$,
  'a signed-in user can create a workspace from a template'
);

create temporary table ws on commit drop as select id from public.workspaces where slug = 'acme';
grant select on ws to authenticated;

select is((select country || currency from public.workspaces where slug = 'acme'), 'GBGBP',
  'country and currency are stored upper-case');

select ok(
  (select is_owner and status = 'active' from public.members
   where workspace_id = (select id from ws) and user_id = (select user_id from people where name = 'alice')),
  'the creator is an active owner'
);

select is(
  (select array_agg(name::text order by name) from public.roles where workspace_id = (select id from ws)),
  array['Admin', 'Finance', 'HR', 'Manager', 'Member'],
  'the company template seeds Admin plus its starter roles'
);

select is(
  (select array_agg(feature_key order by feature_key) from public.workspace_features
   where workspace_id = (select id from ws) and enabled),
  array['org_chart', 'people', 'planning', 'rate_cards', 'time'],
  'the template''s features are switched on'
);

select is(
  (select last_workspace_id from public.profiles where id = (select user_id from people where name = 'alice')),
  (select id from ws),
  'the new workspace becomes the last used one'
);

select throws_ok(
  $$ select public.create_workspace('X', 'admin', 'team', 'GB', 'Europe/London', 'GBP') $$,
  '23514', null, 'reserved web addresses are refused'
);

select throws_ok(
  $$ select public.create_workspace('X', 'acme', 'team', 'GB', 'Europe/London', 'GBP') $$,
  '23505', null, 'web addresses are unique'
);

select throws_ok(
  $$ select public.create_workspace('X', 'two words', 'team', 'GB', 'Europe/London', 'GBP') $$,
  '23514', null, 'web addresses must be lower-case letters, digits and hyphens'
);

select throws_ok(
  $$ select public.create_workspace('X', 'mars', 'team', 'GB', 'Mars/Olympus', 'GBP') $$,
  '23514', null, 'unknown time zones are refused'
);

-- Add Bob (Member) and Carol (HR) directly, as invitations will in production.
select tests.clear_authentication();

insert into public.members (workspace_id, user_id, full_name, email)
select (select id from ws), user_id, initcap(name), name || '@acme.test'
from people where name in ('bob', 'carol');

insert into public.member_roles (workspace_id, member_id, role_id)
select m.workspace_id, m.id, r.id
from public.members m
join public.roles r on r.workspace_id = m.workspace_id
where m.workspace_id = (select id from ws)
  and ((m.email = 'bob@acme.test' and r.name = 'Member') or (m.email = 'carol@acme.test' and r.name = 'HR'));

create temporary table ids on commit drop as
select
  (select id from public.members where email = 'alice@acme.test') as alice_member,
  (select id from public.members where email = 'bob@acme.test') as bob_member,
  (select id from public.members where email = 'carol@acme.test') as carol_member,
  (select id from public.roles where workspace_id = (select id from ws) and name = 'Admin') as admin_role,
  (select id from public.roles where workspace_id = (select id from ws) and name = 'Member') as member_role;
grant select on ids to authenticated;

-- Isolation: a stranger sees nothing --------------------------------------------------------------

select tests.authenticate_as((select user_id from people where name = 'dave'));

select is_empty($$ select 1 from public.workspaces where slug = 'acme' $$, 'strangers cannot see the workspace');
select is_empty($$ select 1 from public.members where workspace_id = (select id from ws) $$, 'strangers cannot see its members');
select is_empty($$ select 1 from public.roles where workspace_id = (select id from ws) $$, 'strangers cannot see its roles');
select is_empty(
  $$ select 1 from public.profiles where id = (select user_id from people where name = 'alice') $$,
  'strangers cannot see profiles of people they share no workspace with'
);
select throws_ok(
  $$ select public.set_feature((select id from ws), 'planning', false, true) $$,
  '42501', null, 'strangers cannot change features'
);
select is(
  (select count(*)::int from public.my_permissions((select id from ws))), 0,
  'strangers hold no permissions'
);

-- A plain member ----------------------------------------------------------------------------------

select tests.authenticate_as((select user_id from people where name = 'bob'));

select is((select count(*)::int from public.members where workspace_id = (select id from ws)), 3,
  'members with members.view see everyone in the workspace');
select ok(
  exists (select 1 from public.profiles where id = (select user_id from people where name = 'alice')),
  'members can see co-members'' profiles'
);
select is_empty(
  $$ select 1 from public.role_permissions where workspace_id = (select id from ws) $$,
  'members without roles.view cannot read role definitions'
);
select ok(
  exists (select 1 from public.my_permissions((select id from ws)) where permission_key = 'time.book'),
  'members hold their role''s permissions'
);
select ok(
  not exists (select 1 from public.my_permissions((select id from ws)) where permission_key = 'workspace.manage_settings'),
  'members do not hold permissions outside their roles'
);

update public.workspaces set name = 'Hacked' where id = (select id from ws);
select tests.clear_authentication();
select is((select name from public.workspaces where id = (select id from ws)), 'Acme',
  'members without workspace.manage_settings cannot rename the workspace');

select tests.authenticate_as((select user_id from people where name = 'bob'));
select throws_ok(
  $$ select public.assign_role((select id from ws), (select bob_member from ids), (select admin_role from ids)) $$,
  '42501', null, 'members cannot assign roles'
);
select throws_ok(
  $$ update public.members set is_owner = true where user_id = auth.uid() $$,
  '42501', null, 'members cannot make themselves owners'
);
select throws_ok(
  $$ update public.profiles set last_workspace_id = gen_random_uuid() where id = auth.uid() $$,
  '42501', null, 'users cannot point their last workspace at one they are not in'
);

-- HR: manages members, but cannot touch owners or grant what they don't hold ---------------------

select tests.authenticate_as((select user_id from people where name = 'carol'));

select lives_ok(
  $$ select public.set_member_status((select id from ws), (select bob_member from ids), 'inactive') $$,
  'HR can deactivate a member'
);
select throws_ok(
  $$ select public.set_member_status((select id from ws), (select alice_member from ids), 'inactive') $$,
  '23514', null, 'owners cannot be deactivated'
);
select throws_ok(
  $$ select public.set_member_status((select id from ws), (select carol_member from ids), 'inactive') $$,
  '23514', null, 'nobody can deactivate themselves'
);
select throws_ok(
  $$ select public.assign_role((select id from ws), (select bob_member from ids), (select member_role from ids)) $$,
  '42501', null, 'HR without roles.assign cannot assign roles'
);

-- Bob is inactive now: he loses access immediately.
select tests.authenticate_as((select user_id from people where name = 'bob'));
select is_empty($$ select 1 from public.workspaces where id = (select id from ws) $$,
  'deactivated members lose access to the workspace');

-- Escalation guards -------------------------------------------------------------------------------

select tests.authenticate_as((select user_id from people where name = 'alice'));

insert into public.roles (workspace_id, name, description)
values ((select id from ws), 'Role admin', 'Manages and assigns roles.');
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select (select id from ws), r.id, p.key, 'workspace'
from public.roles r cross join (values ('roles.view'), ('roles.manage'), ('roles.assign')) as p (key)
where r.workspace_id = (select id from ws) and r.name = 'Role admin';

select lives_ok(
  $$ select public.assign_role((select id from ws), (select carol_member from ids),
       (select id from public.roles where workspace_id = (select id from ws) and name = 'Role admin')) $$,
  'owners can assign any role'
);

select tests.authenticate_as((select user_id from people where name = 'carol'));

select throws_ok(
  $$ insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
     values ((select id from ws), (select member_role from ids), 'workspace.manage_settings', 'workspace') $$,
  '42501', null, 'role managers cannot add permissions they do not hold'
);
select throws_ok(
  $$ select public.assign_role((select id from ws), (select carol_member from ids), (select admin_role from ids)) $$,
  '42501', null, 'role managers cannot assign roles with permissions they do not hold'
);
select lives_ok(
  $$ select public.assign_role((select id from ws), (select bob_member from ids), (select member_role from ids)) $$,
  'role managers can assign roles whose permissions they hold'
);

-- The Admin role is fixed -------------------------------------------------------------------------

select tests.authenticate_as((select user_id from people where name = 'alice'));

select throws_ok(
  $$ delete from public.role_permissions where role_id = (select admin_role from ids) $$,
  '42501', null, 'even owners cannot change the Admin role''s permissions'
);
select throws_ok(
  $$ update public.roles set name = 'Boss' where id = (select admin_role from ids) $$,
  '42501', null, 'even owners cannot rename the Admin role'
);

-- Features ----------------------------------------------------------------------------------------

select throws_ok(
  $$ select public.set_feature((select id from ws), 'planning', false) $$,
  'P0001', 'Turning this off also turns off: rate_cards',
  'turning off a feature others depend on asks for confirmation'
);
select is(
  public.set_feature((select id from ws), 'planning', false, true),
  array['planning', 'rate_cards'],
  'confirmed, it turns off the feature and its dependants'
);
select ok(not app.feature_on((select id from ws), 'rate_cards'), 'switched-off features are off');
select is(
  public.set_feature((select id from ws), 'rate_cards', true),
  array['rate_cards', 'planning'],
  'turning a feature on also turns on what it needs'
);
select throws_ok(
  $$ select public.set_feature((select id from ws), 'members', false) $$,
  '23514', null, 'core features cannot be turned off'
);

-- Owners ------------------------------------------------------------------------------------------

select throws_ok(
  $$ select public.leave_workspace((select id from ws)); set constraints all immediate $$,
  '23514', null, 'the last owner cannot leave'
);

select lives_ok(
  $$ select public.transfer_ownership((select id from ws), (select carol_member from ids)) $$,
  'an owner can hand ownership to another member'
);
select ok(
  (select is_owner from public.members where id = (select carol_member from ids))
  and not (select is_owner from public.members where id = (select alice_member from ids)),
  'ownership moved to the new owner'
);

select * from finish();
rollback;
