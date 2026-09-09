/**
 * CSV parsing and formatting utilities.
 *
 * Pure functions with no framework dependencies — safe to use
 * in workers, server actions, or anywhere else.
 */

// ─── Formatting ─────────────────────────────────────────────────────────────────

/** Wrap a value in quotes and escape inner quotes when necessary. */
export function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── Parsing ────────────────────────────────────────────────────────────────────

/**
 * Robust CSV line parser that handles quoted fields containing commas,
 * escaped quotes (`""`), and newlines.
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

// ─── Column auto-detection ──────────────────────────────────────────────────────

import type { MappingTarget } from "@/components/import/types";

/**
 * Heuristic that maps a CSV column header to the most likely field target.
 * Returns `"extra"` when no pattern matches.
 */
export function autoDetectMapping(header: string): MappingTarget {
  const h = header.toLowerCase();

  if (h.includes("name") && !h.includes("unit") && !h.includes("vendor") && !h.includes("company") && !h.includes("type")) return "fullName";

  if (h.includes("email") || h.includes("e-mail")) {
    // "line manager email" should map to lineManager, not the member's email
    if (h.includes("manager") || h.includes("supervisor") || h.includes("reports")) {
      return "lineManager";
    }
    return "email";
  }

  if (h === "division" || h === "tribe" || h === "cluster" || h === "squad") {
    return "orgLevel";
  }

  if (h.includes("position") || h.includes("title") || h.includes("role")) return "position";
  if (h.includes("grade") || h.includes("level") || h.includes("career")) return "grade";
  if (h.includes("manager") || h.includes("reports to") || h.includes("supervisor")) return "lineManager";
  if (h.includes("employment") || h === "type" || h === "emp type") return "employmentType";
  if (h.includes("salary") || h.includes("annual")) return "salary";
  if (h.includes("day rate") || h.includes("dayrate") || h.includes("daily rate")) return "dayRate";

  return "extra";
}

/**
 * Auto-detect a human-readable org-unit type name from a CSV column header.
 * Falls back to the raw header text when no keyword matches.
 */
export function detectUnitTypeName(header: string): string {
  const h = header.toLowerCase();
  if (h.includes("division")) return "Division";
  if (h.includes("tribe")) return "Tribe";
  if (h.includes("cluster")) return "Cluster";
  if (h.includes("squad")) return "Squad";
  if (h.includes("team")) return "Team";
  if (h.includes("department")) return "Department";
  return header; // fallback to the column header itself
}


/**
 * Auto-detect a default icon for an org-unit type based on its name.
 * Falls back to a rotating list by index to avoid duplicates.
 */
export function detectUnitTypeIcon(header: string, index?: number): string {
  const h = header.toLowerCase();
  if (h.includes("division")) return "domain";
  if (h.includes("tribe")) return "groups";
  if (h.includes("cluster")) return "hub";
  if (h.includes("squad") || h.includes("team")) return "lan";
  if (h.includes("department")) return "apartment";
  // Rotate through distinct icons for unknown names
  const fallbackIcons = [
    "corporate_fare", "account_tree", "schema", "device_hub",
    "diversity_3", "engineering", "badge", "business",
    "work", "storefront",
  ];
  return fallbackIcons[(index ?? 0) % fallbackIcons.length];
}

/**
 * Auto-detect a default color for an org-unit type based on its name.
 * Falls back to a rotating palette by index to avoid duplicates.
 */
export function detectUnitTypeColor(header: string, index?: number): string {
  const h = header.toLowerCase();
  if (h.includes("division")) return "#6366F1";
  if (h.includes("tribe")) return "#0EA5E9";
  if (h.includes("cluster")) return "#14B8A6";
  if (h.includes("squad") || h.includes("team")) return "#F59E0B";
  if (h.includes("department")) return "#3B82F6";
  // Rotate through distinct colors for unknown names
  const fallbackColors = [
    "#8B5CF6", "#EC4899", "#EF4444", "#10B981",
    "#F97316", "#06B6D4", "#84CC16", "#A855F7",
    "#78909C", "#E91E63",
  ];
  return fallbackColors[(index ?? 0) % fallbackColors.length];
}
