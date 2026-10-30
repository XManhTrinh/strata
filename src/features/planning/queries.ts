import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OpenRole } from "@/features/org-chart/types";
import type {
  FieldChoice,
  PlanningSettings,
  RateCard,
  RateCardGroup,
  RateCardSet,
  RateOperator,
} from "./types";

export async function getPlanningSettings(workspaceId: string): Promise<PlanningSettings | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("planning_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return (
    data && {
      period: data.period,
      horizonYears: data.horizon_years,
      displayUnit: data.display_unit,
      overAllocation: data.over_allocation,
      basis: data.basis,
      lifecycle: data.lifecycle,
      costSplitFieldId: data.cost_split_field_id,
    }
  );
}

/** Custom fields in use, for conditions and the cost split. */
export async function listFieldChoices(workspaceId: string): Promise<FieldChoice[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_fields")
    .select("id, key, label")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("sort_order")
    .order("label");
  return (data ?? []).map((f) => ({ id: f.id, key: f.key, label: f.label }));
}

/** Every rate card with its conditions and rates, and the sets and groups they sit in. */
export async function listRateCards(workspaceId: string): Promise<{
  sets: RateCardSet[];
  groups: RateCardGroup[];
  cards: RateCard[];
}> {
  const supabase = await createClient();
  const [sets, groups, cards] = await Promise.all([
    supabase
      .from("rate_card_sets")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("rate_card_groups")
      .select("id, name, set_id")
      .eq("workspace_id", workspaceId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("rate_cards")
      .select(
        "id, name, group_id, priority, is_default, archived_at, rate_card_conditions(field, operator, value, sort_order), rate_card_rates(valid_from, day_rate, working_days, currency)"
      )
      .eq("workspace_id", workspaceId)
      .order("is_default")
      .order("priority")
      .order("created_at"),
  ]);
  return {
    sets: sets.data ?? [],
    groups: (groups.data ?? []).map((g) => ({ id: g.id, name: g.name, setId: g.set_id })),
    cards: (cards.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      groupId: c.group_id,
      priority: c.priority,
      isDefault: c.is_default,
      archived: c.archived_at !== null,
      conditions: [...c.rate_card_conditions]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((k) => ({ field: k.field, operator: k.operator as RateOperator, value: k.value })),
      rates: [...c.rate_card_rates]
        .sort((a, b) => a.valid_from.localeCompare(b.valid_from))
        .map((r) => ({
          validFrom: r.valid_from,
          dayRate: Number(r.day_rate),
          workingDays: Number(r.working_days),
          currency: r.currency,
        })),
    })),
  };
}

/** The live plan's open roles the caller may see, for the org chart. */
export async function listOpenRoles(workspaceId: string): Promise<OpenRole[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("open_roles", { p_workspace_id: workspaceId });
  return (data ?? []).map((r) => ({
    id: r.planned_role_id,
    unitId: r.org_unit_id,
    title: r.title,
    startDate: r.start_date,
    fte: Number(r.fte),
  }));
}
