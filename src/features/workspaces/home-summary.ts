/** What Home shows, as `home_summary` returns it; a card is missing when you may not see it. */
export type HomeSummary = {
  me?: {
    balances: { name: string; available: number }[];
    upcoming: {
      type: string | null;
      title: string | null;
      start_date: string;
      end_date: string;
      status: "approved" | "pending";
    }[];
    waiting: number;
  };
  team?: {
    away: { name: string; type: string | null; start_date: string; end_date: string }[];
    away_count: number;
    approvals: number | null;
  };
  org?: {
    headcount: number;
    starters: number;
    leavers: number;
    units: { name: string; people: number }[];
    plan?: {
      scenario: string;
      units: { name: string; fte: number; cost: number | null; currency: string }[];
    };
  };
};
