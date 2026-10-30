export type DirectoryPerson = {
  id: string;
  fullName: string;
  email: string | null;
  personKey: string | null;
  avatarUrl: string | null;
  unitName: string | null;
  positionName: string | null;
  careerLevelName: string | null;
  employmentTypeName: string | null;
  managerName: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type FilterOption = { id: string; label: string };

export type DirectoryFilterOptions = {
  units: FilterOption[];
  positions: FilterOption[];
  employmentTypes: FilterOption[];
};

export type JobRecord = {
  id: string;
  validFrom: string;
  validTo: string | null;
  unitId: string;
  unitName: string;
  managerId: string | null;
  managerName: string | null;
  positionId: string | null;
  positionName: string | null;
  careerLevelId: string | null;
  careerLevelName: string | null;
  employmentTypeId: string | null;
  employmentTypeName: string | null;
};

type PayRecord = {
  id: string;
  validFrom: string;
  validTo: string | null;
  annualSalary: number | null;
  dayRate: number | null;
  currency: string;
};

export type FieldValue = {
  fieldId: string;
  label: string;
  type: "text" | "number" | "date" | "single_choice" | "multi_choice" | "person";
  sensitive: boolean;
  keepHistory: boolean;
  options: { id: string; label: string; archived: boolean }[];
  /** Today's value: text, number, ISO date, option id(s) or member id. */
  value: unknown;
  /** For person fields: the chosen person's name. */
  personName?: string | null;
};

export type PersonProfile = {
  id: string;
  workspaceId: string;
  fullName: string;
  email: string | null;
  personKey: string | null;
  startDate: string | null;
  endDate: string | null;
  avatarUrl: string | null;
  hasAccount: boolean;
  jobs: JobRecord[];
  /** Null when the caller can't see pay. */
  pay: PayRecord[] | null;
  fields: FieldValue[];
  access: ("people.edit" | "people.view_compensation" | "people.edit_compensation")[];
  currency: string;
};

export type JobChoices = {
  units: FilterOption[];
  positions: FilterOption[];
  careerLevels: FilterOption[];
  employmentTypes: FilterOption[];
};
