export type MemberRow = {
  id: string;
  fullName: string;
  email: string | null;
  status: "active" | "invited" | "inactive";
  isOwner: boolean;
  isYou: boolean;
  /** Has signed in at least once (imported people may not have an account). */
  hasAccount: boolean;
  roleIds: string[];
};

export type RoleOption = {
  id: string;
  name: string;
  isSystem: boolean;
  /** The starter role it was seeded from, e.g. "member". */
  templateRoleKey: string | null;
};

export type PendingInvitation = {
  id: string;
  email: string;
  roleId: string;
  expiresAt: string;
};
