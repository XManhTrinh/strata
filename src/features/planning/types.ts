import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export type PlanningSettings = {
  period: Enums["planning_period"];
  horizonYears: number;
  displayUnit: Enums["planning_unit"];
  overAllocation: Enums["over_allocation_rule"];
  basis: Enums["planning_basis"];
  lifecycle: boolean;
  costSplitFieldId: string | null;
};

export type RateOperator = Enums["rate_operator"];

export const RATE_OPERATORS = [
  "equals",
  "not_equals",
  "starts_with",
  "starts_with_any",
  "ends_with",
  "contains",
  "in",
] as const satisfies readonly RateOperator[];

/** Built-in fields a condition can test; custom fields are `custom:<key>`. */
export const BUILT_IN_FIELDS = [
  "unit",
  "unit_code",
  "position",
  "career_level",
  "employment_type",
  "country",
] as const;

export type RateCondition = { field: string; operator: RateOperator; value: string };

type RateCardRate = {
  /** The first of the month the rate starts. */
  validFrom: string;
  dayRate: number;
  workingDays: number;
  currency: string;
};

export type RateCard = {
  id: string;
  name: string;
  groupId: string | null;
  priority: number;
  isDefault: boolean;
  archived: boolean;
  conditions: RateCondition[];
  rates: RateCardRate[];
};

export type RateCardGroup = { id: string; name: string; setId: string | null };
export type RateCardSet = { id: string; name: string };

/** A custom field a condition or cost split can use. */
export type FieldChoice = { key: string; label: string; id: string };

export type RateCardPreview = {
  cardName: string | null;
  source: Enums["cost_source"];
  /** Null when the cost comes from pay the caller may not see. */
  monthlyCost: number | null;
  currency: string | null;
};

export type ScenarioStatus = Enums["scenario_status"];

export type Scenario = {
  id: string;
  name: string;
  /** First and last month planned (each the first of a month). */
  firstPeriod: string;
  lastPeriod: string;
  status: ScenarioStatus;
  isLive: boolean;
  archived: boolean;
  baselineName: string | null;
  costsAppliedAt: string | null;
};

/** One group's FTE, headcount and cost in one month; cost is null when the caller can't see it. */
export type TotalsRow = {
  groupId: string | null;
  groupLabel: string | null;
  period: string;
  fte: number;
  headcount: number;
  cost: number | null;
  currency: string;
};
