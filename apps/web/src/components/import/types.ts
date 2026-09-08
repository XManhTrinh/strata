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
  { value: "extra", label: "Extra Column" },
  { value: "skip", label: "Skip" },
];
