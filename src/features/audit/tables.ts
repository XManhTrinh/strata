/** Record types the audit log covers. Shared by the server page and the client filters. */
export const AUDIT_TABLES = [
  "workspaces",
  "workspace_features",
  "members",
  "roles",
  "role_permissions",
  "member_roles",
  "invitations",
  "org_unit_levels",
  "org_units",
  "career_levels",
  "positions",
  "employment_types",
  "member_assignments",
  "member_compensation",
  "custom_fields",
  "custom_field_options",
  "member_field_values",
  "member_role_units",
  "import_jobs",
] as const;

export type AuditTable = (typeof AUDIT_TABLES)[number];
