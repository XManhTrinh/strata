export type OrgLevel = { id: string; name: string; sortOrder: number; archived: boolean };

export type OrgUnit = {
  id: string;
  parentId: string | null;
  levelId: string | null;
  name: string;
  code: string | null;
  archived: boolean;
};

/** A unit with its sub-units, for the tree. */
export type OrgUnitNode = OrgUnit & { children: OrgUnitNode[] };
