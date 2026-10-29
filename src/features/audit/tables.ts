/** Record types the audit log covers. Shared by the server page and the client filters. */
export const AUDIT_TABLES = [
  "workspaces",
  "workspace_features",
  "members",
  "roles",
  "role_permissions",
  "member_roles",
  "invitations",
] as const;

export type AuditTable = (typeof AUDIT_TABLES)[number];
