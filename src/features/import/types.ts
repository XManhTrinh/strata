import type { ImportMapping } from "./mapping";

export type PreviewCounts = {
  new: number;
  changed: number;
  unchanged: number;
  errors: number;
  leaving: number;
};

export type ImportJobSummary = {
  id: string;
  status: "staging" | "previewed" | "applying" | "applied" | "cancelled";
  phase: string;
  createdAt: string;
  counts: Partial<PreviewCounts>;
};

export type SavedMapping = { id: string; name: string; mapping: ImportMapping };

export type ImportOptions = {
  effectiveDate: string;
  markLeavers: boolean;
};

export type RowError = { row: number; key: string; errors: string[] };
