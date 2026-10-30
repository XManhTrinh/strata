-- People joining with an account start in the root unit; people added by hand don't get a second record.
begin;
\ir _helpers.psql

select plan(3);

select tests.authenticate_as(tests.create_user('alice@acme.test', 'Alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');

create temporary table ctx on commit drop as
select w.id as ws, (select id from public.org_units where workspace_id = w.id and parent_id is null) as root
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated;

select is(
  (select array_agg(a.org_unit_id = (select root from ctx) and a.valid_from = current_date and a.valid_to is null)
   from public.member_assignments a join public.members m on m.id = a.member_id
   where m.workspace_id = (select ws from ctx) and m.is_owner),
  array[true], 'the creator starts in the root unit today'
);

select public.add_person((select ws from ctx), 'Carol', (select root from ctx), p_start_date => current_date - 10);
select is(
  (select count(*)::int from public.member_assignments a join public.members m on m.id = a.member_id
   where m.workspace_id = (select ws from ctx) and m.full_name = 'Carol'),
  1, 'people added by hand keep the single record from that flow'
);

select tests.clear_authentication();
update public.members set user_id = tests.create_user('carol@acme.test', 'Carol')
where workspace_id = (select ws from ctx) and full_name = 'Carol';
select is(
  (select count(*)::int from public.member_assignments a join public.members m on m.id = a.member_id
   where m.workspace_id = (select ws from ctx) and m.full_name = 'Carol'),
  1, 'linking an account to someone with a record adds nothing'
);

select * from finish();
rollback;
