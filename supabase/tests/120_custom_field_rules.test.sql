-- Custom fields: a fixed key, a type locked by values, options on choice fields only.
begin;
\ir _helpers.psql

select plan(5);

select tests.authenticate_as(tests.create_user('alice@acme.test', 'Alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');

create temporary table ws on commit drop as select id from public.workspaces where slug = 'acme';
grant select on ws to authenticated;

insert into public.custom_fields (workspace_id, key, label, type) values
  ((select id from ws), 'location', 'Location', 'text'),
  ((select id from ws), 'capex', 'Capex or Opex', 'single_choice');

select throws_ok(
  $$ update public.custom_fields set key = 'site' where workspace_id = (select id from ws) and key = 'location' $$,
  '23514', null, 'a field''s key cannot change'
);

select lives_ok(
  $$ update public.custom_fields set type = 'single_choice' where workspace_id = (select id from ws) and key = 'location' $$,
  'the type can change while nobody has a value'
);

insert into public.member_field_values (workspace_id, member_id, field_id, value)
select (select id from ws), m.id, f.id, '"Capex"'::jsonb
from public.members m, public.custom_fields f
where m.workspace_id = (select id from ws) and f.workspace_id = (select id from ws) and f.key = 'capex';

select throws_ok(
  $$ update public.custom_fields set type = 'text' where workspace_id = (select id from ws) and key = 'capex' $$,
  '23514', null, 'the type is locked once people have values'
);

update public.custom_fields set type = 'text' where workspace_id = (select id from ws) and key = 'location';

select throws_ok(
  $$ insert into public.custom_field_options (workspace_id, field_id, label)
     select (select id from ws), id, 'London' from public.custom_fields
     where workspace_id = (select id from ws) and key = 'location' $$,
  '23514', null, 'text fields have no options'
);

select lives_ok(
  $$ insert into public.custom_field_options (workspace_id, field_id, label)
     select (select id from ws), id, 'Capex' from public.custom_fields
     where workspace_id = (select id from ws) and key = 'capex' $$,
  'choice fields take options'
);

select * from finish();
rollback;
