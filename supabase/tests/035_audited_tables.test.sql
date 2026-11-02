-- The audit log's screen names each audited table (src/features/audit/tables.ts and the
-- audit.tables messages). When a table gains or loses its audit trigger, update both.
begin;
\ir _helpers.psql

select plan(1);

select set_eq(
  $$ select distinct c.relname::text from pg_trigger t
     join pg_class c on c.oid = t.tgrelid
     join pg_proc p on p.oid = t.tgfoid
     where p.proname = 'audit_row_change' and not t.tgisinternal $$,
  array['workspaces', 'workspace_features', 'members', 'roles', 'role_permissions', 'member_roles',
    'invitations', 'org_unit_levels', 'org_units', 'career_levels', 'positions', 'employment_types',
    'member_assignments', 'member_compensation', 'custom_fields', 'custom_field_options',
    'member_field_values', 'member_role_units', 'import_jobs', 'work_schedules', 'holiday_calendars',
    'holidays', 'time_types', 'allowance_policies', 'member_allowance_policies', 'bookings',
    'booking_approvals', 'planning_settings', 'scenarios', 'planned_roles', 'rate_card_sets',
    'rate_card_groups', 'rate_cards', 'rate_card_conditions', 'rate_card_rates', 'data_retention',
    'workspace_join_links', 'join_requests'],
  'the audit log screen knows every audited table'
);

select * from finish();
rollback;
