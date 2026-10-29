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
