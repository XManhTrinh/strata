import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Standalone rate-card seeder. Targets a real workspace company (by slug,
 * default "strata") rather than the demo fixture, so the Opex/Capex groups and
 * their per-location × per-band cards show up in the app you actually log into.
 *
 * Idempotent: cards/groups are keyed by (companyId, name), so re-running updates
 * in place instead of duplicating.
 *
 * Usage:
 *   npx tsx src/seed-rate-cards.ts               # slug "strata"
 *   COMPANY_SLUG=acme-corp npx tsx src/seed-rate-cards.ts
 *   COMPANY_ID=<id> npx tsx src/seed-rate-cards.ts
 */

async function resolveCompanyId(): Promise<string> {
  if (process.env.COMPANY_ID) return process.env.COMPANY_ID;
  const slug = process.env.COMPANY_SLUG ?? "strata";
  const company = await prisma.company.findFirst({ where: { slug } });
  if (!company) {
    throw new Error(
      `No company with slug "${slug}". Set COMPANY_ID or COMPANY_SLUG to target the right workspace.`,
    );
  }
  return company.id;
}

async function seedRateCards(companyId: string) {
  // Top-level tab (set) that holds the Opex/Capex groups.
  const set = await prisma.rateCardSet.upsert({
    where: { companyId_name: { companyId, name: "Digital" } },
    update: { description: "Digital rate cards.", color: "#6750A4", displayOrder: 0 },
    create: {
      companyId,
      name: "Digital",
      description: "Digital rate cards.",
      color: "#6750A4",
      displayOrder: 0,
    },
  });
  console.log(`  RateCardSet: ${set.name} (${set.color})`);

  const groups = [
    {
      name: "Opex",
      description: "Actuals rate cards — applied when Capex/Opex = Opex.",
      color: "#F59E0B", // orange
      capexOpex: "Opex",
    },
    {
      name: "Capex",
      description: "Recharge rate cards — applied when Capex/Opex = Capex.",
      color: "#10B981", // green
      capexOpex: "Capex",
    },
  ];

  const groupIdByName = new Map<string, string>();
  for (const g of groups) {
    const row = await prisma.rateCardGroup.upsert({
      where: { companyId_name: { companyId, name: g.name } },
      update: { description: g.description, color: g.color, setId: set.id },
      create: { companyId, name: g.name, description: g.description, color: g.color, setId: set.id },
    });
    groupIdByName.set(g.name, row.id);
    console.log(`  RateCardGroup: ${g.name} (${g.color})`);
  }

  // Clear any previously-seeded cards in these groups so a changed band/location
  // set doesn't leave stale cards behind. Cards are keyed by name, so this keeps
  // re-runs clean when the generated set changes.
  const groupIds = [...groupIdByName.values()];
  const removed = await prisma.rateCard.deleteMany({
    where: { companyId, groupId: { in: groupIds } },
  });
  if (removed.count > 0) console.log(`  Cleared ${removed.count} existing cards in Opex/Capex`);

  // Conditions are matched against the members' imported columns. This data set
  // exposes:
  //   "Opex /Capex"    — matched exactly against "Opex" / "Capex".
  //   "Work Geography" — region: "UK", "AMEA", … Per the Digital Rate Card
  //                      principles: UK → UK, AMEA → OFFSHORE.
  //   "Grade"          — the band letter (A–F).
  const locations = [
    // Working days per quarter: UK = 18, AMEA (Offshore) = 19.
    { label: "UK", geography: "UK", workingDays: 18 },
    { label: "Offshore", geography: "AMEA", workingDays: 19 },
  ];
  const bandOrder = ["A", "B", "C", "D", "E", "F"] as const;

  // Explicit day rates per group · location · band (same across all quarters).
  // A rate of 0 means "no card for this combination" and is skipped.
  const RATES: Record<string, Record<string, Record<string, number>>> = {
    Opex: {
      UK: { A: 2731, B: 996, C: 629, D: 413, E: 265, F: 204 },
      AMEA: { A: 0, B: 962, C: 629, D: 183, E: 91, F: 0 },
    },
    Capex: {
      UK: { A: 0, B: 0, C: 690, D: 438, E: 288, F: 226 },
      AMEA: { A: 0, B: 0, C: 495, D: 198, E: 99, F: 99 },
    },
  };

  let priority = 0;
  let created = 0;

  for (const g of groups) {
    const groupId = groupIdByName.get(g.name)!;
    let groupCount = 0;

    for (const loc of locations) {
      for (const band of bandOrder) {
        const dayRate = RATES[g.capexOpex]?.[loc.geography]?.[band] ?? 0;
        if (dayRate <= 0) continue; // no card for zero-rate combinations
        const days = loc.workingDays;
        const name = `${g.name} · ${loc.label} Band ${band}`;
        const conditions = [
          { column: "OUC", operator: "STARTS_WITH", value: "Q" },
          { column: "Employment Type", operator: "EQUALS", value: "Perm" },
          { column: "Opex /Capex", operator: "EQUALS", value: g.capexOpex },
          { column: "Work Geography", operator: "EQUALS", value: loc.geography },
          { column: "Grade", operator: "EQUALS", value: band },
        ];

        await prisma.rateCard.create({
          data: {
            companyId,
            groupId,
            name,
            priority,
            isDefault: false,
            conditions,
            q1DayRate: dayRate, q1WorkingDays: days,
            q2DayRate: dayRate, q2WorkingDays: days,
            q3DayRate: dayRate, q3WorkingDays: days,
            q4DayRate: dayRate, q4WorkingDays: days,
          },
        });
        priority += 1;
        created += 1;
        groupCount += 1;
      }
    }
    console.log(`  ${g.name}: ${groupCount} cards`);
  }

  console.log(`Total rate cards: ${created}`);
}

async function main() {
  const companyId = await resolveCompanyId();
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, slug: true } });
  console.log(`Seeding rate cards into: ${company?.name} (${company?.slug} / ${companyId})`);
  await seedRateCards(companyId);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
