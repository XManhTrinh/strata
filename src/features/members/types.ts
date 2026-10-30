export type MemberRow = {
  id: string;
  fullName: string;
  email: string | null;
  status: "active" | "invited" | "inactive";
  isOwner: boolean;
  isYou: boolean;
  /** Has signed in at least once (imported people may not have an account). */
  hasAccount: boolean;
  avatarUrl: string | null;
  roleIds: string[];
  /** Each role assignment's id and, for roles that act on specific units, those units. */
  assignments: { roleId: string; id: string; unitIds: string[] }[];
};

export type RoleOption = {
  id: string;
  name: string;
  isSystem: boolean;
  /** The starter role it was seeded from, e.g. "member". */
  templateRoleKey: string | null;
  /** Some of its permissions apply to specific units, chosen per assignment. */
  unitReach: boolean;
};

export type PendingInvitation = {
  id: string;
  email: string;
  roleId: string;
  expiresAt: string;
};
