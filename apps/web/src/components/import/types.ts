/**
 * Shared types and constants for the CSV import feature.
 *
 * Kept separate from UI so they can be imported by utilities
 * (like `lib/csv.ts`) without pulling in React.
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export type MappingTarget =
  | "fullName"
  | "email"
  | "orgLevel"
  | "position"
  | "grade"
  | "lineManager"
  | "employmentType"
  | "salary"
  | "dayRate"
  | "p1" | "p2" | "p3" | "p4" | "p5" | "p6" | "p7" | "p8" | "p9" | "p10" | "p11" | "p12"
  | "extra"
  | "skip";

export interface ColumnMapping {
  csvHeader: string;
  target: MappingTarget;
  /** For orgLevel columns: the human-readable type name (e.g. "Division", "Tribe"). */
  unitTypeName?: string;
  /** For orgLevel columns: the icon name for the unit type. */
  unitTypeIcon?: string;
  /** For orgLevel columns: the hex color for the unit type. */
  unitTypeColor?: string;
}

export type ImportStep = "upload" | "mapping" | "preview";

// ─── Constants ──────────────────────────────────────────────────────────────────

export const MAPPING_OPTIONS: { value: MappingTarget; label: string }[] = [
  { value: "fullName", label: "Full Name" },
  { value: "email", label: "Email" },
  { value: "orgLevel", label: "Org Level (specify type below)" },
  { value: "position", label: "Position" },
  { value: "grade", label: "Grade / Career Level" },
  { value: "lineManager", label: "Line Manager" },
  { value: "employmentType", label: "Employment Type (Perm/SubCon)" },
  { value: "salary", label: "Annual Salary (Perm)" },
  { value: "dayRate", label: "Day Rate (SubCon)" },
  { value: "p1", label: "P1" },
  { value: "p2", label: "P2" },
  { value: "p3", label: "P3" },
  { value: "p4", label: "P4" },
  { value: "p5", label: "P5" },
  { value: "p6", label: "P6" },
  { value: "p7", label: "P7" },
  { value: "p8", label: "P8" },
  { value: "p9", label: "P9" },
  { value: "p10", label: "P10" },
  { value: "p11", label: "P11" },
  { value: "p12", label: "P12" },
  { value: "extra", label: "Extra Column" },
  { value: "skip", label: "Skip" },
];
