export interface Tribe {
  name: string;
  squads: string[];
}

export const TRIBES: Tribe[] = [
  {
    name: "Platform Infrastructure",
    squads: ["Infrastructure", "Web Platform", "SRE"],
  },
  {
    name: "Growth & Engagement",
    squads: ["Feed", "Messaging", "Ads"],
  },
  {
    name: "Product & Strategy",
    squads: ["Core Product", "Data & Analytics"],
  },
  {
    name: "Design & UX",
    squads: ["Product Design", "Brand"],
  },
  {
    name: "People & Culture",
    squads: ["HR Operations", "Talent Acquisition", "Learning & Development"],
  },
  {
    name: "Business Operations",
    squads: ["Finance", "Legal", "Marketing", "Sales"],
  },
];

export const ALL_SQUADS = TRIBES.flatMap((t) => t.squads);

export function getTribeForSquad(squad: string): string | undefined {
  return TRIBES.find((t) => t.squads.includes(squad))?.name;
}
