-- Join links: who may switch one on, what the link shows, asking to join (once, while it works),
-- approving with a role you could give, declining, withdrawing, and who sees what.
begin;
\ir _helpers.psql

select plan(20);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob')),
  ('dave', tests.create_user('dave@else.test', 'Dave')),
  ('erin', tests.create_user('erin@else.test', 'Erin')),
  ('frank', tests.create_user('frank@else.test', 'Frank'));
create function pg_temp.as_user(p_name text) returns void language sql as
  $$ select tests.authenticate_as((select user_id from people where name = p_name)) $$;
grant execute on function pg_temp.as_user(text) to authenticated;

select pg_temp.as_user('alice');
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();
create temporary table ctx on commit drop as select id as ws from public.workspaces where slug = 'acme';
grant select on ctx to authenticated;
create function pg_temp.role(p_name text) returns uuid language sql as
  $$ select id from public.roles where workspace_id = (select ws from ctx) and name = p_name $$;
create function pg_temp.request(p_name text) returns uuid language sql as
  $$ select r.id from public.join_requests r join people p on p.user_id = r.user_id
     where r.workspace_id = (select ws from ctx) and p.name = p_name order by r.created_at desc limit 1 $$;
grant execute on function pg_temp.role(text), pg_temp.request(text) to authenticated;
insert into public.members (workspace_id, user_id, full_name, email)
select (select ws from ctx), user_id, 'Bob', 'bob@acme.test' from people where name = 'bob';
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), m.id, pg_temp.role('Member') from public.members m where m.full_name = 'Bob';
create temporary table link (token text) on commit drop;
grant select, insert, delete on link to authenticated;

-- Switching it on -----------------------------------------------------------------------------------
select pg_temp.as_user('bob');
select throws_ok($$ select public.set_join_link((select ws from ctx), pg_temp.role('Member')) $$, '42501', null,
  'members can''t switch on a join link');
select pg_temp.as_user('alice');
select throws_ok($$ select public.set_join_link((select ws from ctx), pg_temp.role('Member'), now() - interval '1 day') $$,
  '23514', null, 'a link can''t expire in the past');
insert into link select public.set_join_link((select ws from ctx), pg_temp.role('Member'));
select is((select char_length(token) from link), 64, 'the owner gets the link''s token once');
select is((select count(*)::integer from public.workspace_join_links where token_hash = convert_to((select token from link), 'UTF8')), 0,
  'only its hash is kept');

-- Asking -------------------------------------------------------------------------------------------------
select pg_temp.as_user('dave');
select is((select workspace_name || ' ' || is_member from public.join_link_info((select token from link))), 'Acme false',
  'the link shows the workspace''s name to anyone signed in');
select is((select count(*)::integer from public.join_link_info('nope')), 0, 'a wrong link shows nothing');
select lives_ok($$ select public.request_to_join((select token from link), 'I''m in Finance') $$, 'Dave asks to join');
select throws_ok($$ select public.request_to_join((select token from link)) $$, '23514', null, 'once at a time');
select is((select full_name || ' <' || email || '>' from public.join_requests), 'Dave <dave@else.test>',
  'he sees his request');
select throws_ok($$ select public.decide_join_request(pg_temp.request('dave'), true) $$, '42501', null,
  'and can''t answer it');
select pg_temp.as_user('bob');
select is((select count(*)::integer from public.join_requests) + (select count(*)::integer from public.workspace_join_links), 0,
  'members without the invite permission see neither requests nor the link');
select pg_temp.as_user('alice');
select is((select count(*)::integer from public.notifications where kind = 'join.requested'), 1, 'the owner is told');

-- Approving -----------------------------------------------------------------------------------------------
select lives_ok($$ select public.decide_join_request(pg_temp.request('dave'), true) $$, 'the owner approves');
select tests.clear_authentication();
select is((select m.status::text || ' ' || string_agg(r.name, ', ') from public.members m
  join public.member_roles mr on mr.member_id = m.id join public.roles r on r.id = mr.role_id
  join people p on p.user_id = m.user_id where p.name = 'dave' group by m.status), 'active Member',
  'Dave joins with the link''s role');
select pg_temp.as_user('dave');
select is((select count(*)::integer from public.notifications where kind = 'join.approved'), 1, 'and hears so');
select throws_ok($$ select public.request_to_join((select token from link)) $$, '23514', null, 'members don''t ask again');

-- Declining and withdrawing -----------------------------------------------------------------------------
select pg_temp.as_user('erin');
select public.request_to_join((select token from link));
select pg_temp.as_user('alice');
select public.decide_join_request(pg_temp.request('erin'), false);
select pg_temp.as_user('frank');
select public.request_to_join((select token from link));
select public.withdraw_join_request(pg_temp.request('frank'));
select tests.clear_authentication();
select is((select string_agg(status, ', ' order by full_name) from public.join_requests where full_name in ('Erin', 'Frank')),
  'declined, withdrawn', 'requests can be declined, or withdrawn by whoever asked');

-- Expiry and switching off ------------------------------------------------------------------------------
update public.workspace_join_links set expires_at = now() - interval '1 minute' where workspace_id = (select ws from ctx);
select pg_temp.as_user('frank');
select is((select count(*)::integer from public.join_link_info((select token from link))), 0, 'an expired link shows nothing');
select pg_temp.as_user('alice');
select public.disable_join_link((select ws from ctx));
select pg_temp.as_user('frank');
select throws_ok($$ select public.request_to_join((select token from link)) $$, 'P0002', null,
  'a link that''s switched off no longer works');
select tests.clear_authentication();
select is(app.apply_retention((select ws from ctx), current_date + 400) ->> 'notifications' is not null, true,
  'retention runs with join requests in place');

select * from finish();
rollback;
