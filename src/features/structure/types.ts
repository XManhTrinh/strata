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

export type CostMethod = "annual_salary" | "day_rate";

export type CareerLevel = {
  id: string;
  name: string;
  rank: number;
  track: string | null;
  archived: boolean;
};

export type Position = {
  id: string;
  name: string;
  description: string;
  minLevelId: string | null;
  maxLevelId: string | null;
  archived: boolean;
};

export type EmploymentType = {
  id: string;
  name: string;
  costMethod: CostMethod;
  archived: boolean;
};
