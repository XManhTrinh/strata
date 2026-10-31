export type PlanningTab = "scenarios" | "totals" | "compare" | "rate-cards";

/** The Planning screens someone may open, in order, from the permissions they hold. */
export function planningTabs(holds: (permission: string) => boolean): PlanningTab[] {
  return [
    ...(holds("planning.view") ? (["scenarios", "totals", "compare"] as const) : []),
    ...(holds("rate_cards.view") ? (["rate-cards"] as const) : []),
  ];
}
