/** Deterministic fake people for the spike, so every run measures the same data. */
export type SpikePerson = {
  id: string;
  name: string;
  email: string;
  team: string;
  position: string;
  startDate: string;
  salary: number;
};

const FIRST = [
  "Ana",
  "Ben",
  "Carla",
  "Dan",
  "Elena",
  "Filip",
  "Gina",
  "Horia",
  "Ioana",
  "Jon",
  "Kai",
  "Lia",
];
const LAST = [
  "Pop",
  "Ionescu",
  "Smith",
  "Jones",
  "Rossi",
  "Muller",
  "Novak",
  "Silva",
  "Kim",
  "Brown",
];
const TEAMS = ["Squad A", "Squad B", "Squad C", "Platform", "Payments", "Mobile", "Data", "Design"];
const POSITIONS = ["Engineer", "Senior engineer", "Lead", "Designer", "Product manager", "Analyst"];

export function generatePeople(count: number): SpikePerson[] {
  return Array.from({ length: count }, (_, i) => {
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[Math.floor(i / FIRST.length) % LAST.length]!;
    return {
      id: String(i + 1),
      name: `${first} ${last} ${i + 1}`,
      email: `${first}.${last}.${i + 1}@example.test`.toLowerCase(),
      team: TEAMS[(i * 7) % TEAMS.length]!,
      position: POSITIONS[(i * 3) % POSITIONS.length]!,
      startDate: `20${String(10 + (i % 15)).padStart(2, "0")}-${String(1 + (i % 12)).padStart(2, "0")}-01`,
      salary: 30000 + ((i * 7919) % 90000),
    };
  });
}
