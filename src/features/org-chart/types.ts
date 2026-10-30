export type ChartPerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
  position: string | null;
  unit: string | null;
  managerId: string | null;
  /** Relative to the start: negative above, positive below. */
  depth: number;
  directReports: number;
  /** Their manager exists but is outside the viewer's reach. */
  managerHidden: boolean;
};

export type ChartSlice = { people: ChartPerson[]; truncated: boolean };

export type UnitCount = { id: string; direct: number; total: number };
