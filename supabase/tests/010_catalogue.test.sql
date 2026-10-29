-- The platform catalogue is consistent, readable by signed-in users only, and read-only.
begin;
\ir _helpers.psql

select plan(10);

select is_empty(
  $$ with recursive walk (start_key, key) as (
       select feature_key, requires_key from public.feature_dependencies
       union
       select w.start_key, d.requires_key
       from walk w join public.feature_dependencies d on d.feature_key = w.key
     )
     select start_key from walk where start_key = key $$,
  'feature dependencies have no cycles'
);

select is_empty(
  $$ select tf.template_key, d.requires_key
     from public.template_features tf
     join public.feature_dependencies d on d.feature_key = tf.feature_key
     join public.features f on f.key = d.requires_key and not f.is_core
     where not exists (select 1 from public.template_features x
                       where x.template_key = tf.template_key and x.feature_key = d.requires_key) $$,
  'every template enables the features its features depend on'
);

select is_empty(
  $$ select trp.template_key, trp.role_key, trp.permission_key
     from public.template_role_permissions trp
     join public.permissions p on p.key = trp.permission_key
     join public.features f on f.key = p.feature_key
     where not f.is_core
       and not exists (select 1 from public.template_features tf
                       where tf.template_key = trp.template_key and tf.feature_key = p.feature_key) $$,
  'starter roles only use permissions of features their template enables'
);

select is_empty(
  $$ select f.key from public.features f
     where not exists (select 1 from public.subscription_plan_features spf
                       where spf.plan_key = 'free' and spf.feature_key = f.key) $$,
  'the Free plan allows every feature'
);

select throws_ok(
  $$ insert into public.template_role_permissions (template_key, role_key, permission_key, reach)
     values ('company', 'hr', 'workspace.manage_settings', 'own') $$,
  '23514', null,
  'unscoped permissions cannot have a reach narrower than the workspace'
);

-- Signed-in users can read the catalogue but not change it.
select tests.authenticate_as(tests.create_user('reader@example.com'));

select ok((select count(*) from public.features) = 8, 'signed-in users can read features');
select ok((select count(*) from public.permissions) > 0, 'signed-in users can read permissions');

select throws_ok(
  $$ insert into public.features (key, name, description, sort_order) values ('x', 'X', 'X', 1) $$,
  '42501', null,
  'signed-in users cannot add features'
);

select throws_ok(
  $$ delete from public.permissions $$,
  '42501', null,
  'signed-in users cannot delete permissions'
);

select tests.authenticate_as_anon();

select throws_ok(
  $$ select count(*) from public.features $$,
  '42501', null,
  'anonymous visitors cannot read the catalogue'
);

select * from finish();
rollback;
