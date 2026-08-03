export interface Tribe {
  name: string;
  squads: string[];
}

export const TRIBES: Tribe[] = [
  {
    name: "Discovery",
    squads: ["PLP", "PDP", "Search"],
  },
  {
    name: "Commerce",
    squads: ["Checkout", "Basket", "Order Management"],
  },
  {
    name: "Growth",
    squads: ["Navigation", "Learn", "Cross-sell"],
  },
  {
    name: "Platform",
    squads: ["L2"],
  },
];

export const ALL_SQUADS = TRIBES.flatMap((t) => t.squads);

export function getTribeForSquad(squad: string): string | undefined {
  return TRIBES.find((t) => t.squads.includes(squad))?.name;
}
