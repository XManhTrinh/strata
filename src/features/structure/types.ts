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

export type CustomFieldType =
  "text" | "number" | "date" | "single_choice" | "multi_choice" | "person";

export type FieldOption = { id: string; name: string; archived: boolean };

export type CustomField = {
  id: string;
  key: string;
  /** The field's label, as `name` so it lists like other entries. */
  name: string;
  type: CustomFieldType;
  sensitive: boolean;
  required: boolean;
  keepHistory: boolean;
  archived: boolean;
  options: FieldOption[];
};
