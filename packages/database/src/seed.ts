import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Deterministic IDs for idempotency ────────────────────────────────────────

const IDS = {
  company: "cm_acme_corp_001",
  legacyOrg: "org_acme_legacy_001",
  // Org Unit Types
  orgUnitTypes: {
    division: "out_division_001",
    department: "out_department_001",
    tribe: "out_tribe_001",
    cluster: "out_cluster_001",
    squad: "out_squad_001",
  },
  // Org Units
  orgUnits: {
    // Departments (root level)
    engineering: "ou_engineering_001",
    product: "ou_product_001",
    design: "ou_design_001",
    finance: "ou_finance_001",
    people: "ou_people_001",
    hr: "ou_hr_001",
    legal: "ou_legal_001",
    marketing: "ou_marketing_001",
    sales: "ou_sales_001",
    operations: "ou_operations_001",
    // Tribes (under Engineering)
    platformTribe: "ou_platform_tribe_001",
    productTribe: "ou_product_tribe_001",
    // Clusters (under Platform Infrastructure Tribe)
    coreInfraCluster: "ou_core_infra_cluster_001",
    reliabilityCluster: "ou_reliability_cluster_001",
    // Clusters (under Growth & Engagement Tribe)
    consumerCluster: "ou_consumer_cluster_001",
    monetizationCluster: "ou_monetization_cluster_001",
    // Squads (under Core Infrastructure Cluster)
    infraSquad: "ou_infra_squad_001",
    webSquad: "ou_web_squad_001",
    // Squads (under Reliability Cluster)
    sreSquad: "ou_sre_squad_001",
    // Squads (under Consumer Cluster)
    feedSquad: "ou_feed_squad_001",
    messagingSquad: "ou_messaging_squad_001",
    // Squads (under Monetization Cluster)
    adsSquad: "ou_ads_squad_001",
    // Squads (under Product & Strategy)
    coreProductSquad: "ou_core_prod_001",
    dataSquad: "ou_data_squad_001",
    // Squads (under Design & UX)
    productDesignSquad: "ou_prod_design_001",
    brandSquad: "ou_brand_squad_001",
  },
  // Positions
  positions: {
    softwareEngineer: "pos_sw_eng_001",
    seniorEngineer: "pos_sr_eng_001",
    staffEngineer: "pos_staff_eng_001",
    engineeringManager: "pos_eng_mgr_001",
    seniorEngineeringManager: "pos_sr_eng_mgr_001",
    productManager: "pos_prod_mgr_001",
    seniorProductManager: "pos_sr_prod_mgr_001",
    designer: "pos_designer_001",
    seniorDesigner: "pos_sr_designer_001",
    cto: "pos_cto_001",
    cfo: "pos_cfo_001",
    cpo: "pos_cpo_001",
    vpEngineering: "pos_vp_eng_001",
    vpProduct: "pos_vp_prod_001",
    vpDesign: "pos_vp_design_001",
    director: "pos_director_001",
  },
  // Roles
  roles: {
    admin: "role_admin_001",
    manager: "role_manager_001",
    employee: "role_employee_001",
  },
  // Features
  features: {
    people: "feat_people_001",
    calendar: "feat_calendar_001",
    engineering: "feat_engineering_001",
  },
  // Feature Permissions
  featurePermissions: {
    peopleRead: "fp_people_read_001",
    peopleWrite: "fp_people_write_001",
    calendarRead: "fp_calendar_read_001",
    calendarWrite: "fp_calendar_write_001",
    engineeringRead: "fp_engineering_read_001",
    engineeringWrite: "fp_engineering_write_001",
  },
  // Users (Person, User, Employee share index) — first 12 hardcoded, rest generated
  persons: Array.from({ length: 500 }, (_, i) => `per_${String(i + 1).padStart(3, "0")}`),
  users: Array.from({ length: 500 }, (_, i) => `usr_${String(i + 1).padStart(3, "0")}`),
  employees: Array.from({ length: 500 }, (_, i) => `emp_${String(i + 1).padStart(3, "0")}`),
  // Event Types
  eventTypes: {
    meeting: "evt_meeting_001",
    holiday: "evt_holiday_001",
    outOfOffice: "evt_ooo_001",
    workshop: "evt_workshop_001",
  },
  // Leave Types
  leaveTypes: {
    annual: "lt_annual_001",
    sick: "lt_sick_001",
  },
};

// ─── Logging Helpers ──────────────────────────────────────────────────────────

function log(message: string) {
  console.log(`  🌱 ${message}`);
}

function logSection(title: string) {
  console.log(`\n━━━ ${title} ━━━`);
}

// ─── User Data ────────────────────────────────────────────────────────────────

const USER_DATA = [
  { firstName: "Sarah", lastName: "Chen", email: "sarah.chen@strata.io", role: "CTO" },
  { firstName: "David", lastName: "Thompson", email: "david.thompson@strata.io", role: "CFO" },
  { firstName: "Amara", lastName: "Okafor", email: "amara.okafor@strata.io", role: "CPO" },
  { firstName: "Marcus", lastName: "Williams", email: "marcus.williams@strata.io", role: "VP Engineering" },
  { firstName: "Priya", lastName: "Patel", email: "priya.patel@strata.io", role: "VP Product" },
  { firstName: "James", lastName: "O'Brien", email: "james.obrien@strata.io", role: "Director" },
  { firstName: "Lisa", lastName: "Nakamura", email: "lisa.nakamura@strata.io", role: "Senior Engineering Manager" },
  { firstName: "Andre", lastName: "Santos", email: "andre.santos@strata.io", role: "Engineering Manager" },
  { firstName: "Emily", lastName: "Richardson", email: "emily.richardson@strata.io", role: "Staff Engineer" },
  { firstName: "Kevin", lastName: "Zhao", email: "kevin.zhao@strata.io", role: "Senior Engineer" },
  { firstName: "Maya", lastName: "Johansson", email: "maya.johansson@strata.io", role: "Senior Designer" },
  { firstName: "Raj", lastName: "Krishnamurthy", email: "raj.krishnamurthy@strata.io", role: "Senior Product Manager" },
];

// ─── Additional Users (13–100) ────────────────────────────────────────────────

function generateAdditionalUsers(count: number) {
  const firstNames = [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Quinn", "Riley", "Avery",
    "Jamie", "Cameron", "Dakota", "Reese", "Skyler", "Sage", "Rowan", "Finley",
    "Charlie", "Hayden", "Emery", "Phoenix", "Kai", "Arden", "Blake", "Drew",
    "Alexis", "Peyton", "Parker", "River", "Micah", "Eden", "Zion", "Remy",
    "Tatum", "Lennox", "Atlas", "Oakley", "Nova", "Wren", "Scout", "Harley",
    "Nico", "Rio", "Shay", "Lane", "Ellis", "Ira", "Kit", "Sol",
    "Asa", "Bay", "Cruz", "Dex", "Fox", "Gray", "Hart", "Jade",
    "Lake", "Mars", "Oak", "Penn", "Reed", "Storm", "Vale", "West",
    "Aspen", "Briar", "Cedar", "Dove", "Echo", "Frost", "Glen", "Haven",
    "Indigo", "Jasper", "Lark", "Moss", "North", "Ocean", "Pine", "Rain",
    "Sky", "Terra", "Vera", "Winter", "Zephyr", "Amber", "Brook", "Coral",
  ];
  const lastNames = [
    "Anderson", "Baker", "Carter", "Davis", "Edwards", "Fisher", "Garcia",
    "Harris", "Ibrahim", "Jackson", "Kumar", "Lee", "Martinez", "Nelson",
    "Okafor", "Park", "Quinn", "Robinson", "Singh", "Torres", "Ueda",
    "Volkov", "Wang", "Xu", "Yamamoto", "Zhang", "Ali", "Bhat", "Costa",
    "Diaz", "Evans", "Fernandez", "Gupta", "Hoffman", "Ivanov", "Johal",
    "Khan", "Liu", "Moreau", "Nguyen", "Ortiz", "Petrov", "Rashid",
    "Santos", "Tanaka", "Uddin", "Vega", "Weber", "Yang", "Zhu",
  ];
  const roles = ["Software Engineer", "Software Engineer", "Software Engineer", "Senior Engineer", "Designer"];

  return Array.from({ length: count }, (_, i) => ({
    firstName: firstNames[i % firstNames.length],
    lastName: lastNames[i % lastNames.length],
    email: `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}@strata.io`,
    role: roles[i % roles.length],
  }));
}

const ADDITIONAL_USERS = generateAdditionalUsers(488); // Generate 488 more users (13–500)


// ═══════════════════════════════════════════════════════════════════════════════
// Company & Organization Structure
// ═══════════════════════════════════════════════════════════════════════════════

async function seedCompany() {
  logSection("Company");
  const company = await prisma.company.upsert({
    where: { slug: "acme-corp" },
    update: { name: "Strata Technologies" },
    create: {
      id: IDS.company,
      name: "Strata Technologies",
      slug: "acme-corp",
      settings: { theme: "default", locale: "en-US" },
    },
  });
  log(`Company: ${company.name} (${company.id})`);
  return company;
}

async function seedLegacyOrganization() {
  logSection("Organization (legacy — skipped, model removed)");
  log(`Skipping legacy organization seed (Organization model removed)`);
  return { id: IDS.legacyOrg, name: "Strata Technologies" };
}

async function seedOrgUnitTypes(companyId: string) {
  logSection("Organization Unit Types");
  const types = [
    { id: IDS.orgUnitTypes.division, name: "Division", description: "Top-level strategic grouping", icon: "globe", color: "#1E40AF", displayOrder: 1 },
    { id: IDS.orgUnitTypes.department, name: "Department", description: "Functional organizational unit", icon: "building", color: "#3B82F6", displayOrder: 2 },
    { id: IDS.orgUnitTypes.tribe, name: "Tribe", description: "Cross-functional group of squads", icon: "users", color: "#8B5CF6", displayOrder: 3 },
    { id: IDS.orgUnitTypes.cluster, name: "Cluster", description: "Group of related squads within a tribe", icon: "layers", color: "#F59E0B", displayOrder: 4 },
    { id: IDS.orgUnitTypes.squad, name: "Squad", description: "Autonomous delivery team", icon: "user-group", color: "#10B981", displayOrder: 5 },
  ];

  const results = [];
  for (const t of types) {
    const result = await prisma.organizationUnitType.upsert({
      where: { companyId_name: { companyId, name: t.name } },
      update: { description: t.description, icon: t.icon, color: t.color, displayOrder: t.displayOrder },
      create: { id: t.id, companyId, name: t.name, description: t.description, icon: t.icon, color: t.color, displayOrder: t.displayOrder },
    });
    results.push(result);
    log(`OrgUnitType: ${result.name}`);
  }
  return results;
}

async function seedOrgUnits(companyId: string, types: Awaited<ReturnType<typeof seedOrgUnitTypes>>) {
  logSection("Organization Units");
  const deptType = types.find((t) => t.name === "Department")!;
  const tribeType = types.find((t) => t.name === "Tribe")!;
  const clusterType = types.find((t) => t.name === "Cluster")!;
  const squadType = types.find((t) => t.name === "Squad")!;

  // Full hierarchy:
  // Engineering (Department)
  // ├── Platform Infrastructure (Tribe)
  // │   ├── Core Infrastructure (Cluster)
  // │   │   ├── Cloud Services (Squad)
  // │   │   └── Developer Experience (Squad)
  // │   └── Reliability (Cluster)
  // │       └── Site Reliability (Squad)
  // └── Growth & Engagement (Tribe)
  //     ├── Consumer (Cluster)
  //     │   ├── Feed & Discovery (Squad)
  //     │   └── Messaging Platform (Squad)
  //     └── Monetization (Cluster)
  //         └── Ads Platform (Squad)
  // Product & Strategy (Department)
  // ├── Core Product (Squad)
  // └── Data & Analytics (Squad)
  // Design & UX (Department)
  // ├── Product Design (Squad)
  // └── Brand & Content (Squad)
  // Finance & Operations (Department)
  // People & Culture (Department)

  const units = [
    // Level 1 — Departments (root)
    { id: IDS.orgUnits.engineering, typeId: deptType.id, name: "Engineering", code: "ENG", parentId: null, path: `/${IDS.orgUnits.engineering}`, sortOrder: 1 },
    { id: IDS.orgUnits.product, typeId: deptType.id, name: "Product & Strategy", code: "PROD", parentId: null, path: `/${IDS.orgUnits.product}`, sortOrder: 2 },
    { id: IDS.orgUnits.design, typeId: deptType.id, name: "Design & UX", code: "DSG", parentId: null, path: `/${IDS.orgUnits.design}`, sortOrder: 3 },
    { id: IDS.orgUnits.finance, typeId: deptType.id, name: "Finance & Operations", code: "FIN", parentId: null, path: `/${IDS.orgUnits.finance}`, sortOrder: 4 },
    { id: IDS.orgUnits.people, typeId: deptType.id, name: "People & Culture", code: "PPL", parentId: null, path: `/${IDS.orgUnits.people}`, sortOrder: 5 },
    // Level 2 — Tribes under Engineering
    { id: IDS.orgUnits.platformTribe, typeId: tribeType.id, name: "Platform Infrastructure", code: "PLAT", parentId: IDS.orgUnits.engineering, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.platformTribe}`, sortOrder: 1 },
    { id: IDS.orgUnits.productTribe, typeId: tribeType.id, name: "Growth & Engagement", code: "GRWTH", parentId: IDS.orgUnits.engineering, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.productTribe}`, sortOrder: 2 },
    // Level 3 — Clusters under Platform Infrastructure Tribe
    { id: IDS.orgUnits.coreInfraCluster, typeId: clusterType.id, name: "Core Infrastructure", code: "CINF", parentId: IDS.orgUnits.platformTribe, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.platformTribe}/${IDS.orgUnits.coreInfraCluster}`, sortOrder: 1 },
    { id: IDS.orgUnits.reliabilityCluster, typeId: clusterType.id, name: "Reliability", code: "REL", parentId: IDS.orgUnits.platformTribe, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.platformTribe}/${IDS.orgUnits.reliabilityCluster}`, sortOrder: 2 },
    // Level 3 — Clusters under Growth & Engagement Tribe
    { id: IDS.orgUnits.consumerCluster, typeId: clusterType.id, name: "Consumer", code: "CONS", parentId: IDS.orgUnits.productTribe, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.productTribe}/${IDS.orgUnits.consumerCluster}`, sortOrder: 1 },
    { id: IDS.orgUnits.monetizationCluster, typeId: clusterType.id, name: "Monetization", code: "MNTX", parentId: IDS.orgUnits.productTribe, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.productTribe}/${IDS.orgUnits.monetizationCluster}`, sortOrder: 2 },
    // Level 4 — Squads under Core Infrastructure Cluster
    { id: IDS.orgUnits.infraSquad, typeId: squadType.id, name: "Cloud Services", code: "CLOUD", parentId: IDS.orgUnits.coreInfraCluster, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.platformTribe}/${IDS.orgUnits.coreInfraCluster}/${IDS.orgUnits.infraSquad}`, sortOrder: 1 },
    { id: IDS.orgUnits.webSquad, typeId: squadType.id, name: "Developer Experience", code: "DEVX", parentId: IDS.orgUnits.coreInfraCluster, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.platformTribe}/${IDS.orgUnits.coreInfraCluster}/${IDS.orgUnits.webSquad}`, sortOrder: 2 },
    // Level 4 — Squads under Reliability Cluster
    { id: IDS.orgUnits.sreSquad, typeId: squadType.id, name: "Site Reliability", code: "SRE", parentId: IDS.orgUnits.reliabilityCluster, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.platformTribe}/${IDS.orgUnits.reliabilityCluster}/${IDS.orgUnits.sreSquad}`, sortOrder: 1 },
    // Level 4 — Squads under Consumer Cluster
    { id: IDS.orgUnits.feedSquad, typeId: squadType.id, name: "Feed & Discovery", code: "FEED", parentId: IDS.orgUnits.consumerCluster, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.productTribe}/${IDS.orgUnits.consumerCluster}/${IDS.orgUnits.feedSquad}`, sortOrder: 1 },
    { id: IDS.orgUnits.messagingSquad, typeId: squadType.id, name: "Messaging Platform", code: "MSG", parentId: IDS.orgUnits.consumerCluster, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.productTribe}/${IDS.orgUnits.consumerCluster}/${IDS.orgUnits.messagingSquad}`, sortOrder: 2 },
    // Level 4 — Squads under Monetization Cluster
    { id: IDS.orgUnits.adsSquad, typeId: squadType.id, name: "Ads Platform", code: "ADS", parentId: IDS.orgUnits.monetizationCluster, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.productTribe}/${IDS.orgUnits.monetizationCluster}/${IDS.orgUnits.adsSquad}`, sortOrder: 1 },
    // Level 2 — Squads under Product & Strategy
    { id: IDS.orgUnits.coreProductSquad, typeId: squadType.id, name: "Core Product", code: "CPROD", parentId: IDS.orgUnits.product, path: `/${IDS.orgUnits.product}/${IDS.orgUnits.coreProductSquad}`, sortOrder: 1 },
    { id: IDS.orgUnits.dataSquad, typeId: squadType.id, name: "Data & Analytics", code: "DATA", parentId: IDS.orgUnits.product, path: `/${IDS.orgUnits.product}/${IDS.orgUnits.dataSquad}`, sortOrder: 2 },
    // Level 2 — Squads under Design & UX
    { id: IDS.orgUnits.productDesignSquad, typeId: squadType.id, name: "Product Design", code: "PDSG", parentId: IDS.orgUnits.design, path: `/${IDS.orgUnits.design}/${IDS.orgUnits.productDesignSquad}`, sortOrder: 1 },
    { id: IDS.orgUnits.brandSquad, typeId: squadType.id, name: "Brand & Content", code: "BRND", parentId: IDS.orgUnits.design, path: `/${IDS.orgUnits.design}/${IDS.orgUnits.brandSquad}`, sortOrder: 2 },
    // Level 1 — Additional Departments
    { id: IDS.orgUnits.hr, typeId: deptType.id, name: "Human Resources", code: "HR", parentId: null, path: `/${IDS.orgUnits.hr}`, sortOrder: 6 },
    { id: IDS.orgUnits.legal, typeId: deptType.id, name: "Legal", code: "LGL", parentId: null, path: `/${IDS.orgUnits.legal}`, sortOrder: 7 },
    { id: IDS.orgUnits.marketing, typeId: deptType.id, name: "Marketing", code: "MKT", parentId: null, path: `/${IDS.orgUnits.marketing}`, sortOrder: 8 },
    { id: IDS.orgUnits.sales, typeId: deptType.id, name: "Sales", code: "SLS", parentId: null, path: `/${IDS.orgUnits.sales}`, sortOrder: 9 },
    { id: IDS.orgUnits.operations, typeId: deptType.id, name: "Operations", code: "OPS", parentId: null, path: `/${IDS.orgUnits.operations}`, sortOrder: 10 },
  ];

  const results = [];
  for (const u of units) {
    const result = await prisma.organizationUnit.upsert({
      where: { id: u.id },
      update: { name: u.name, code: u.code, parentId: u.parentId, path: u.path, sortOrder: u.sortOrder, typeId: u.typeId },
      create: { id: u.id, companyId, typeId: u.typeId, name: u.name, code: u.code, parentId: u.parentId, path: u.path, sortOrder: u.sortOrder },
    });
    results.push(result);
    log(`OrgUnit: ${result.name} (path: ${result.path})`);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Users, Roles, and Reporting
// ═══════════════════════════════════════════════════════════════════════════════

async function seedCareerLevels(companyId: string) {
  logSection("Career Level Scheme");

  const scheme = await prisma.careerLevelScheme.upsert({
    where: { companyId },
    update: { type: "numeric" },
    create: {
      id: "cls_acme_001",
      companyId,
      type: "numeric",
    },
  });

  const levels = [
    { id: "cl_l1", rank: 1, label: "L1", displayName: "Junior", track: "IC" },
    { id: "cl_l2", rank: 2, label: "L2", displayName: "Mid", track: "IC" },
    { id: "cl_l3", rank: 3, label: "L3", displayName: "Senior", track: "IC" },
    { id: "cl_l4", rank: 4, label: "L4", displayName: "Staff", track: "IC" },
    { id: "cl_l5", rank: 5, label: "L5", displayName: "Principal", track: "IC" },
    { id: "cl_m3", rank: 6, label: "M3", displayName: "Manager", track: "Management" },
    { id: "cl_m4", rank: 7, label: "M4", displayName: "Senior Manager", track: "Management" },
    { id: "cl_m5", rank: 8, label: "M5", displayName: "Director", track: "Management" },
    { id: "cl_m6", rank: 9, label: "M6", displayName: "VP", track: "Management" },
    { id: "cl_m7", rank: 10, label: "M7", displayName: "C-Suite", track: "Management" },
  ];

  const results: Record<string, string> = {};
  for (const level of levels) {
    const result = await prisma.careerLevel.upsert({
      where: { schemeId_label: { schemeId: scheme.id, label: level.label } },
      update: { displayName: level.displayName, track: level.track },
      create: { id: level.id, schemeId: scheme.id, rank: level.rank, label: level.label, displayName: level.displayName, track: level.track },
    });
    results[level.label] = result.id;
    log(`CareerLevel: ${level.label} — ${level.displayName} (${level.track})`);
  }
  return results;
}

async function seedPositions(companyId: string, careerLevels: Record<string, string>) {
  logSection("Positions (V2)");

  // Map positions to career level ranges
  const levelRangeMap: Record<string, { min: string; max: string }> = {
    CTO: { min: careerLevels["M7"], max: careerLevels["M7"] },
    CFO: { min: careerLevels["M7"], max: careerLevels["M7"] },
    CPO: { min: careerLevels["M7"], max: careerLevels["M7"] },
    "VP Engineering": { min: careerLevels["M6"], max: careerLevels["M6"] },
    "VP Product": { min: careerLevels["M6"], max: careerLevels["M6"] },
    "VP Design": { min: careerLevels["M6"], max: careerLevels["M6"] },
    "Director of Engineering": { min: careerLevels["M5"], max: careerLevels["M5"] },
    "Senior Engineering Manager": { min: careerLevels["M4"], max: careerLevels["M4"] },
    "Engineering Manager": { min: careerLevels["M3"], max: careerLevels["M4"] },
    "Staff Engineer": { min: careerLevels["L4"], max: careerLevels["L5"] },
    "Senior Engineer": { min: careerLevels["L3"], max: careerLevels["L4"] },
    "Senior Product Manager": { min: careerLevels["L3"], max: careerLevels["L4"] },
    "Senior Designer": { min: careerLevels["L3"], max: careerLevels["L4"] },
    "Product Manager": { min: careerLevels["L2"], max: careerLevels["L3"] },
    "Software Engineer": { min: careerLevels["L1"], max: careerLevels["L3"] },
    Designer: { min: careerLevels["L1"], max: careerLevels["L3"] },
  };

  const positions = [
    { id: IDS.positions.cto, name: "CTO", canHaveDirectReports: true },
    { id: IDS.positions.cfo, name: "CFO", canHaveDirectReports: true },
    { id: IDS.positions.cpo, name: "CPO", canHaveDirectReports: true },
    { id: IDS.positions.vpEngineering, name: "VP Engineering", canHaveDirectReports: true },
    { id: IDS.positions.vpProduct, name: "VP Product", canHaveDirectReports: true },
    { id: IDS.positions.vpDesign, name: "VP Design", canHaveDirectReports: true },
    { id: IDS.positions.director, name: "Director of Engineering", canHaveDirectReports: true },
    { id: IDS.positions.seniorEngineeringManager, name: "Senior Engineering Manager", canHaveDirectReports: true },
    { id: IDS.positions.engineeringManager, name: "Engineering Manager", canHaveDirectReports: true },
    { id: IDS.positions.staffEngineer, name: "Staff Engineer", canHaveDirectReports: false },
    { id: IDS.positions.seniorEngineer, name: "Senior Engineer", canHaveDirectReports: false },
    { id: IDS.positions.seniorProductManager, name: "Senior Product Manager", canHaveDirectReports: false },
    { id: IDS.positions.seniorDesigner, name: "Senior Designer", canHaveDirectReports: false },
    { id: IDS.positions.productManager, name: "Product Manager", canHaveDirectReports: false },
    { id: IDS.positions.softwareEngineer, name: "Software Engineer", canHaveDirectReports: false },
    { id: IDS.positions.designer, name: "Designer", canHaveDirectReports: false },
  ];

  const results = [];
  for (const pos of positions) {
    const range = levelRangeMap[pos.name];
    const result = await prisma.position.upsert({
      where: { companyId_name: { companyId, name: pos.name } },
      update: { canHaveDirectReports: pos.canHaveDirectReports, minLevelId: range?.min, maxLevelId: range?.max },
      create: { id: pos.id, companyId, name: pos.name, canHaveDirectReports: pos.canHaveDirectReports, minLevelId: range?.min, maxLevelId: range?.max },
    });
    results.push(result);
    log(`Position: ${result.name} → range [${range?.min ? "set" : "—"}, ${range?.max ? "set" : "—"}]`);
  }
  return results;
}

async function seedUsers(
  companyId: string,
  organizationId: string,
  _orgUnits: Awaited<ReturnType<typeof seedOrgUnits>>,
  _positions: Awaited<ReturnType<typeof seedPositions>>,
) {
  logSection("Users (Person + User + Membership)");

  const posMap: Record<string, string> = {
    CTO: IDS.positions.cto,
    CFO: IDS.positions.cfo,
    CPO: IDS.positions.cpo,
    "VP Engineering": IDS.positions.vpEngineering,
    "VP Product": IDS.positions.vpProduct,
    Director: IDS.positions.director,
    "Senior Engineering Manager": IDS.positions.seniorEngineeringManager,
    "Engineering Manager": IDS.positions.engineeringManager,
    "Staff Engineer": IDS.positions.staffEngineer,
    "Senior Engineer": IDS.positions.seniorEngineer,
    "Senior Designer": IDS.positions.seniorDesigner,
    "Senior Product Manager": IDS.positions.seniorProductManager,
    "Product Manager": IDS.positions.productManager,
    "Software Engineer": IDS.positions.softwareEngineer,
    Designer: IDS.positions.designer,
  };

  const orgUnitMap: Record<string, string> = {
    CTO: IDS.orgUnits.engineering,
    CFO: IDS.orgUnits.finance,
    CPO: IDS.orgUnits.product,
    "VP Engineering": IDS.orgUnits.engineering,
    "VP Product": IDS.orgUnits.product,
    Director: IDS.orgUnits.engineering,
    "Senior Engineering Manager": IDS.orgUnits.platformTribe,
    "Engineering Manager": IDS.orgUnits.productTribe,
    "Staff Engineer": IDS.orgUnits.infraSquad,
    "Senior Engineer": IDS.orgUnits.infraSquad,
    "Senior Designer": IDS.orgUnits.productDesignSquad,
    "Senior Product Manager": IDS.orgUnits.coreProductSquad,
    "Product Manager": IDS.orgUnits.coreProductSquad,
    "Software Engineer": IDS.orgUnits.infraSquad,
    Designer: IDS.orgUnits.productDesignSquad,
  };

  const users = [];

  for (let i = 0; i < USER_DATA.length; i++) {
    const u = USER_DATA[i];
    const personId = IDS.persons[i];
    const userId = IDS.users[i];
    const employeeId = IDS.employees[i];

    // Upsert Person
    const person = await prisma.person.upsert({
      where: { id: personId },
      update: { fullName: `${u.firstName} ${u.lastName}`, email: u.email },
      create: {
        id: personId,
        fullName: `${u.firstName} ${u.lastName}`,
        email: u.email,
        dateOfBirth: new Date(1985 + i, i % 12, (i * 3) % 28 + 1),
        phone: `+1-555-${String(1000 + i).padStart(4, "0")}`,
        address: `${100 + i} Main St, Tech City, TC ${10000 + i}`,
      },
    });

    // Upsert User
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: userId,
        email: u.email,
        personId: person.id,
      },
    });
    users.push(user);

    // Upsert UserCompanyMembership
    await prisma.userCompanyMembership.upsert({
      where: { userId_companyId: { userId: user.id, companyId } },
      update: { positionId: posMap[u.role], orgUnitId: orgUnitMap[u.role] },
      create: {
        userId: user.id,
        companyId,
        positionId: posMap[u.role],
        orgUnitId: orgUnitMap[u.role],
        isSuperAdmin: false,
      },
    });

    log(`User: ${u.firstName} ${u.lastName} (${u.email}) — ${u.role}`);
  }

  // ─── Additional Users (13–100) ──────────────────────────────────────────────
  const orgUnitIds = [
    IDS.orgUnits.infraSquad,
    IDS.orgUnits.webSquad,
    IDS.orgUnits.sreSquad,
    IDS.orgUnits.feedSquad,
    IDS.orgUnits.messagingSquad,
    IDS.orgUnits.adsSquad,
    IDS.orgUnits.coreProductSquad,
    IDS.orgUnits.dataSquad,
    IDS.orgUnits.productDesignSquad,
    IDS.orgUnits.brandSquad,
    IDS.orgUnits.hr,
    IDS.orgUnits.legal,
    IDS.orgUnits.marketing,
    IDS.orgUnits.sales,
    IDS.orgUnits.finance,
    IDS.orgUnits.people,
  ];

  for (let i = 0; i < ADDITIONAL_USERS.length; i++) {
    const idx = i + 12; // 0-based index in the full 100 array (12..99)
    const u = ADDITIONAL_USERS[i];
    const personId = IDS.persons[idx];
    const userId = IDS.users[idx];
    const employeeId = IDS.employees[idx];

    const person = await prisma.person.upsert({
      where: { id: personId },
      update: { fullName: `${u.firstName} ${u.lastName}`, email: u.email },
      create: {
        id: personId,
        fullName: `${u.firstName} ${u.lastName}`,
        email: u.email,
        dateOfBirth: new Date(1985 + (idx % 20), idx % 12, (idx * 3) % 28 + 1),
        phone: `+1-555-${String(1000 + idx).padStart(4, "0")}`,
        address: `${100 + idx} Main St, Tech City, TC ${10000 + idx}`,
      },
    });

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: userId,
        email: u.email,
        personId: person.id,
      },
    });
    users.push(user);

    const assignedOrgUnit = orgUnitIds[i % orgUnitIds.length];
    const assignedPosition = posMap[u.role] ?? IDS.positions.softwareEngineer;

    await prisma.userCompanyMembership.upsert({
      where: { userId_companyId: { userId: user.id, companyId } },
      update: { positionId: assignedPosition, orgUnitId: assignedOrgUnit },
      create: {
        userId: user.id,
        companyId,
        positionId: assignedPosition,
        orgUnitId: assignedOrgUnit,
        isSuperAdmin: false,
      },
    });

    if ((i + 1) % 10 === 0) {
      log(`Created ${i + 1}/138 additional users...`);
    }
  }
  log(`Total users created: ${users.length}`);

  return { users };
}

async function seedFeatures() {
  logSection("Features & Permissions");
  const features = [
    {
      id: IDS.features.people,
      key: "people",
      displayName: "People Management",
      permissions: [
        { id: IDS.featurePermissions.peopleRead, key: "read", displayName: "View People" },
        { id: IDS.featurePermissions.peopleWrite, key: "write", displayName: "Manage People" },
      ],
    },
    {
      id: IDS.features.calendar,
      key: "calendar",
      displayName: "Calendar & Leave",
      permissions: [
        { id: IDS.featurePermissions.calendarRead, key: "read", displayName: "View Calendar" },
        { id: IDS.featurePermissions.calendarWrite, key: "write", displayName: "Manage Calendar" },
      ],
    },
    {
      id: IDS.features.engineering,
      key: "engineering",
      displayName: "Engineering",
      permissions: [
        { id: IDS.featurePermissions.engineeringRead, key: "read", displayName: "View Engineering" },
        { id: IDS.featurePermissions.engineeringWrite, key: "write", displayName: "Manage Engineering" },
      ],
    },
  ];

  for (const f of features) {
    const feature = await prisma.feature.upsert({
      where: { key: f.key },
      update: { displayName: f.displayName },
      create: { id: f.id, key: f.key, displayName: f.displayName },
    });

    for (const p of f.permissions) {
      await prisma.featurePermission.upsert({
        where: { featureId_key: { featureId: feature.id, key: p.key } },
        update: { displayName: p.displayName },
        create: { id: p.id, featureId: feature.id, key: p.key, displayName: p.displayName },
      });
    }

    // Enable feature for company
    await prisma.companyFeature.upsert({
      where: { companyId_featureId: { companyId: IDS.company, featureId: feature.id } },
      update: { enabled: true },
      create: { companyId: IDS.company, featureId: feature.id, enabled: true },
    });

    log(`Feature: ${f.displayName} (${f.permissions.length} permissions)`);
  }
}

async function seedRoles(companyId: string) {
  logSection("Roles (V2)");
  const roles = [
    { id: IDS.roles.admin, name: "Admin", description: "Full access to all features", isSystem: true },
    { id: IDS.roles.manager, name: "Manager", description: "Can manage direct reports and team resources", isSystem: true },
    { id: IDS.roles.employee, name: "Employee", description: "Standard employee access", isSystem: false },
  ];

  const results = [];
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { companyId_name: { companyId, name: r.name } },
      update: { description: r.description },
      create: { id: r.id, companyId, name: r.name, description: r.description, isSystem: r.isSystem },
    });
    results.push(role);
    log(`Role: ${role.name}`);
  }

  // Assign permissions to roles — covering all 6 PermissionScopeV2 values
  const scopeAssignments: Array<{ roleId: string; featurePermissionId: string; scope: "OWN" | "DIRECT_REPORTS" | "ORGANIZATION_UNIT" | "BRANCH" | "COMPANY" | "GLOBAL" }> = [
    // Admin gets GLOBAL + COMPANY scope on all permissions
    { roleId: IDS.roles.admin, featurePermissionId: IDS.featurePermissions.peopleRead, scope: "GLOBAL" },
    { roleId: IDS.roles.admin, featurePermissionId: IDS.featurePermissions.peopleWrite, scope: "COMPANY" },
    { roleId: IDS.roles.admin, featurePermissionId: IDS.featurePermissions.calendarRead, scope: "GLOBAL" },
    { roleId: IDS.roles.admin, featurePermissionId: IDS.featurePermissions.calendarWrite, scope: "COMPANY" },
    { roleId: IDS.roles.admin, featurePermissionId: IDS.featurePermissions.engineeringRead, scope: "GLOBAL" },
    { roleId: IDS.roles.admin, featurePermissionId: IDS.featurePermissions.engineeringWrite, scope: "COMPANY" },
    // Manager gets DIRECT_REPORTS + ORGANIZATION_UNIT + BRANCH
    { roleId: IDS.roles.manager, featurePermissionId: IDS.featurePermissions.peopleRead, scope: "BRANCH" },
    { roleId: IDS.roles.manager, featurePermissionId: IDS.featurePermissions.peopleWrite, scope: "DIRECT_REPORTS" },
    { roleId: IDS.roles.manager, featurePermissionId: IDS.featurePermissions.calendarRead, scope: "ORGANIZATION_UNIT" },
    { roleId: IDS.roles.manager, featurePermissionId: IDS.featurePermissions.calendarWrite, scope: "DIRECT_REPORTS" },
    // Employee gets OWN scope
    { roleId: IDS.roles.employee, featurePermissionId: IDS.featurePermissions.peopleRead, scope: "OWN" },
    { roleId: IDS.roles.employee, featurePermissionId: IDS.featurePermissions.calendarRead, scope: "OWN" },
    { roleId: IDS.roles.employee, featurePermissionId: IDS.featurePermissions.calendarWrite, scope: "OWN" },
  ];

  for (const sa of scopeAssignments) {
    await prisma.rolePermission.upsert({
      where: { roleId_featurePermissionId_scope: { roleId: sa.roleId, featurePermissionId: sa.featurePermissionId, scope: sa.scope } },
      update: {},
      create: { roleId: sa.roleId, featurePermissionId: sa.featurePermissionId, scope: sa.scope },
    });
  }
  log(`Assigned ${scopeAssignments.length} role-permission combinations covering all 6 PermissionScopeV2 values`);

  return results;
}

async function seedRoleAssignments(companyId: string, users: { id: string }[], roles: { id: string; name: string }[]) {
  logSection("Role Assignments");
  const adminRole = roles.find((r) => r.name === "Admin")!;
  const managerRole = roles.find((r) => r.name === "Manager")!;
  const employeeRole = roles.find((r) => r.name === "Employee")!;

  // Map users to roles based on their position in USER_DATA
  const assignments: Array<{ userId: string; roleId: string }> = [
    { userId: IDS.users[0], roleId: adminRole.id },     // Sarah (CTO) → Admin
    { userId: IDS.users[1], roleId: adminRole.id },     // David (CFO) → Admin
    { userId: IDS.users[2], roleId: adminRole.id },     // Amara (CPO) → Admin
    { userId: IDS.users[3], roleId: managerRole.id },   // Marcus (VP Eng) → Manager
    { userId: IDS.users[4], roleId: managerRole.id },   // Priya (VP Product) → Manager
    { userId: IDS.users[5], roleId: managerRole.id },   // James (Director) → Manager
    { userId: IDS.users[6], roleId: managerRole.id },   // Lisa (Senior EM) → Manager
    { userId: IDS.users[7], roleId: managerRole.id },   // Andre (EM) → Manager
    { userId: IDS.users[8], roleId: employeeRole.id },  // Emily (Staff Eng) → Employee
    { userId: IDS.users[9], roleId: employeeRole.id },  // Kevin (Senior Eng) → Employee
    { userId: IDS.users[10], roleId: employeeRole.id }, // Maya (Senior Designer) → Employee
    { userId: IDS.users[11], roleId: employeeRole.id }, // Raj (Senior PM) → Employee
  ];

  for (const a of assignments) {
    const membership = await prisma.userCompanyMembership.findUnique({
      where: { userId_companyId: { userId: a.userId, companyId } },
    });
    if (membership) {
      await prisma.roleAssignment.upsert({
        where: { membershipId_roleId: { membershipId: membership.id, roleId: a.roleId } },
        update: {},
        create: { membershipId: membership.id, roleId: a.roleId, assignedBy: IDS.users[0] },
      });
    }
  }

  // Assign Employee role to additional users (13–150)
  for (let i = 12; i < 150; i++) {
    const membership = await prisma.userCompanyMembership.findUnique({
      where: { userId_companyId: { userId: IDS.users[i], companyId } },
    });
    if (membership) {
      await prisma.roleAssignment.upsert({
        where: { membershipId_roleId: { membershipId: membership.id, roleId: employeeRole.id } },
        update: {},
        create: { membershipId: membership.id, roleId: employeeRole.id, assignedBy: IDS.users[0] },
      });
    }
  }
  log(`Assigned ${assignments.length + 488} user-role mappings`);
}

async function seedReportingRelationships(companyId: string) {
  logSection("Reporting Relationships");
  
  const relationships: { userId: string; managerId: string }[] = [];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 1: C-suite → CEO (Sarah, idx 0 is root)
  // ═══════════════════════════════════════════════════════════════════════════
  relationships.push({ userId: IDS.users[1], managerId: IDS.users[0] });  // CFO David → CEO
  relationships.push({ userId: IDS.users[2], managerId: IDS.users[0] });  // CPO Amara → CEO
  relationships.push({ userId: IDS.users[3], managerId: IDS.users[0] });  // VP Eng Marcus → CEO
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 2: VPs and Directors
  // ═══════════════════════════════════════════════════════════════════════════
  relationships.push({ userId: IDS.users[4], managerId: IDS.users[2] });  // VP Product Priya → CPO
  relationships.push({ userId: IDS.users[10], managerId: IDS.users[2] }); // Design lead Maya → CPO
  relationships.push({ userId: IDS.users[5], managerId: IDS.users[3] });  // Director James → VP Eng
  relationships.push({ userId: IDS.users[6], managerId: IDS.users[3] });  // Sr EM Lisa → VP Eng
  relationships.push({ userId: IDS.users[7], managerId: IDS.users[3] });  // EM Andre → VP Eng
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 3: Managers and Leads
  // ═══════════════════════════════════════════════════════════════════════════
  relationships.push({ userId: IDS.users[8], managerId: IDS.users[6] });  // Staff Eng Emily → Lisa
  relationships.push({ userId: IDS.users[9], managerId: IDS.users[6] });  // Sr Eng Kevin → Lisa
  relationships.push({ userId: IDS.users[11], managerId: IDS.users[4] }); // Sr PM Raj → VP Product
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINEERING (indexes 12-249, ~238 engineers across multiple teams)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Emily's team (idx 8): 8 direct leads + their teams
  for (let i = 12; i <= 19; i++) {
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[8] });
  }
  // Each of Emily's leads (12-19) manages 10 engineers (indexes 100-179)
  for (let i = 100; i <= 179; i++) {
    const managerIdx = 12 + Math.floor((i - 100) / 10); // 12 manages 100-109, 13 manages 110-119, etc.
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[managerIdx] });
  }
  
  // Kevin's team (idx 9): 8 direct leads
  for (let i = 20; i <= 27; i++) {
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[9] });
  }
  // Each of Kevin's leads (20-27) manages 5 engineers (indexes 180-219)
  for (let i = 180; i <= 219; i++) {
    const managerIdx = 20 + Math.floor((i - 180) / 5);
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[managerIdx] });
  }
  
  // Andre's team (idx 7): 12 direct reports
  for (let i = 28; i <= 39; i++) {
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[7] });
  }
  // Andre's leads (28-33) each manage 5 engineers (indexes 220-249)
  for (let i = 220; i <= 249; i++) {
    const managerIdx = 28 + Math.floor((i - 220) / 5);
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[managerIdx] });
  }
  
  // James's team (idx 5): 10 senior engineers + their reports
  for (let i = 40; i <= 49; i++) {
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[5] });
  }
  // James's seniors (40-49) each manage 3 engineers (indexes 250-279)
  for (let i = 250; i <= 279; i++) {
    const managerIdx = 40 + Math.floor((i - 250) / 3);
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[managerIdx] });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DESIGN (indexes 60-69 + 280-309, ~30 designers)
  // ═══════════════════════════════════════════════════════════════════════════
  for (let i = 60; i <= 69; i++) {
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[10] }); // → Maya
  }
  // Design leads (60-64) each manage 6 junior designers (indexes 280-309)
  for (let i = 280; i <= 309; i++) {
    const managerIdx = 60 + Math.floor((i - 280) / 6);
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[managerIdx] });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT (indexes 70-79 + 310-349, ~30 PMs)
  // ═══════════════════════════════════════════════════════════════════════════
  for (let i = 70; i <= 79; i++) {
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[11] }); // → Raj
  }
  // PM leads (70-74) each manage 8 PMs (indexes 310-349)
  for (let i = 310; i <= 349; i++) {
    const managerIdx = 70 + Math.floor((i - 310) / 8);
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[managerIdx] });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCE (indexes 80-89 + 350-379, ~40 people)
  // ═══════════════════════════════════════════════════════════════════════════
  for (let i = 80; i <= 89; i++) {
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[1] }); // → CFO David
  }
  // Finance leads (80-84) each manage 6 analysts (indexes 350-379)
  for (let i = 350; i <= 379; i++) {
    const managerIdx = 80 + Math.floor((i - 350) / 6);
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[managerIdx] });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HR / PEOPLE (indexes 380-419, ~40 people) → reports to CEO
  // Head of HR = idx 50, reports to CEO
  // ═══════════════════════════════════════════════════════════════════════════
  relationships.push({ userId: IDS.users[50], managerId: IDS.users[0] }); // Head of HR → CEO
  for (let i = 51; i <= 55; i++) {
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[50] }); // HR managers → Head of HR
  }
  // HR team (indexes 380-419) → HR managers (51-55), 8 each
  for (let i = 380; i <= 419; i++) {
    const managerIdx = 51 + Math.floor((i - 380) / 8);
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[managerIdx] });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LEGAL (indexes 420-449, ~30 people) → reports to CEO
  // Head of Legal = idx 56, reports to CEO
  // ═══════════════════════════════════════════════════════════════════════════
  relationships.push({ userId: IDS.users[56], managerId: IDS.users[0] }); // Head of Legal → CEO
  for (let i = 57; i <= 59; i++) {
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[56] }); // Legal managers → Head of Legal
  }
  // Legal team (indexes 420-449) → Legal managers (57-59), 10 each
  for (let i = 420; i <= 449; i++) {
    const managerIdx = 57 + Math.floor((i - 420) / 10);
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[managerIdx] });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MARKETING (indexes 450-474, ~25 people) → reports to CPO
  // Head of Marketing = idx 90, reports to CPO
  // ═══════════════════════════════════════════════════════════════════════════
  relationships.push({ userId: IDS.users[90], managerId: IDS.users[2] }); // Head of Marketing → CPO
  for (let i = 91; i <= 94; i++) {
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[90] }); // Marketing leads
  }
  // Marketing team (indexes 450-474) → Marketing leads (91-94), ~6 each
  for (let i = 450; i <= 474; i++) {
    const managerIdx = 91 + Math.floor((i - 450) / 7);
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[managerIdx] });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SALES (indexes 475-499, ~25 people) → reports to CEO
  // Head of Sales = idx 95, reports to CEO
  // ═══════════════════════════════════════════════════════════════════════════
  relationships.push({ userId: IDS.users[95], managerId: IDS.users[0] }); // Head of Sales → CEO
  for (let i = 96; i <= 99; i++) {
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[95] }); // Sales managers
  }
  // Sales team (indexes 475-499) → Sales managers (96-99), ~6 each
  for (let i = 475; i <= 499; i++) {
    const managerIdx = 96 + Math.floor((i - 475) / 7);
    relationships.push({ userId: IDS.users[i], managerId: IDS.users[managerIdx] });
  }

  for (const r of relationships) {
    await prisma.reportingRelationship.upsert({
      where: { userId: r.userId },
      update: { managerId: r.managerId },
      create: { companyId, userId: r.userId, managerId: r.managerId },
    });
  }
  log(`Created ${relationships.length} reporting relationships`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Calendar and Leave Data
// ═══════════════════════════════════════════════════════════════════════════════

async function seedEventTypes(companyId: string) {
  logSection("Event Types");
  const eventTypes = [
    { id: IDS.eventTypes.meeting, name: "Meeting", color: "#3B82F6", icon: "calendar", isSystem: true },
    { id: IDS.eventTypes.holiday, name: "Holiday", color: "#F59E0B", icon: "sun", isSystem: true },
    { id: IDS.eventTypes.outOfOffice, name: "Out of Office", color: "#EF4444", icon: "plane", isSystem: true },
    { id: IDS.eventTypes.workshop, name: "Workshop", color: "#8B5CF6", icon: "book", isSystem: false },
  ];

  const results = [];
  for (const et of eventTypes) {
    const result = await prisma.eventType.upsert({
      where: { companyId_name: { companyId, name: et.name } },
      update: { color: et.color, icon: et.icon },
      create: { id: et.id, companyId, name: et.name, color: et.color, icon: et.icon, isSystem: et.isSystem },
    });
    results.push(result);
    log(`EventType: ${result.name}`);
  }
  return results;
}

async function seedLeaveTypes(companyId: string) {
  logSection("Leave Type Configs");
  const leaveTypes = [
    { id: IDS.leaveTypes.annual, name: "Annual Leave", color: "#10B981", defaultAllocation: 20.0, requiresApproval: true, carryOver: true, maxCarryOverDays: 5.0 },
    { id: IDS.leaveTypes.sick, name: "Sick Leave", color: "#EF4444", defaultAllocation: 10.0, requiresApproval: false, carryOver: false, maxCarryOverDays: null },
  ];

  const results = [];
  for (const lt of leaveTypes) {
    const result = await prisma.leaveTypeConfig.upsert({
      where: { companyId_name: { companyId, name: lt.name } },
      update: { defaultAllocation: lt.defaultAllocation, requiresApproval: lt.requiresApproval, carryOver: lt.carryOver },
      create: {
        id: lt.id,
        companyId,
        name: lt.name,
        color: lt.color,
        defaultAllocation: lt.defaultAllocation,
        requiresApproval: lt.requiresApproval,
        carryOver: lt.carryOver,
        maxCarryOverDays: lt.maxCarryOverDays,
      },
    });
    results.push(result);
    log(`LeaveTypeConfig: ${result.name} (${lt.defaultAllocation} days)`);
  }
  return results;
}

async function seedCalendarEvents(companyId: string, users: { id: string }[], eventTypes: Awaited<ReturnType<typeof seedEventTypes>>) {
  logSection("Calendar Events");
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const meetingType = eventTypes.find((et) => et.name === "Meeting")!;
  const holidayType = eventTypes.find((et) => et.name === "Holiday")!;
  const oooType = eventTypes.find((et) => et.name === "Out of Office")!;
  const workshopType = eventTypes.find((et) => et.name === "Workshop")!;

  const events: Array<{
    id: string;
    ownerUserId: string;
    eventTypeId: string;
    title: string;
    startDate: Date;
    endDate: Date;
    allDay: boolean;
    isRecurring?: boolean;
    recurrenceFrequency?: string | null;
    recurrenceDaysOfWeek?: number[];
    recurrenceEndDate?: Date | null;
  }> = [
    { id: "ce_001", ownerUserId: IDS.users[0], eventTypeId: meetingType.id, title: "Engineering All-Hands", startDate: new Date(currentYear, currentMonth, 5, 10, 0), endDate: new Date(currentYear, currentMonth, 5, 11, 0), allDay: false },
    { id: "ce_002", ownerUserId: IDS.users[1], eventTypeId: meetingType.id, title: "Sprint Review - Platform", startDate: new Date(currentYear, currentMonth, 8, 9, 0), endDate: new Date(currentYear, currentMonth, 8, 10, 30), allDay: false },
    { id: "ce_003", ownerUserId: IDS.users[2], eventTypeId: meetingType.id, title: "Design Crit", startDate: new Date(currentYear, currentMonth, 10, 14, 0), endDate: new Date(currentYear, currentMonth, 10, 15, 0), allDay: false },
    { id: "ce_004", ownerUserId: IDS.users[3], eventTypeId: oooType.id, title: "James OOO - Conference", startDate: new Date(currentYear, currentMonth, 12), endDate: new Date(currentYear, currentMonth, 14), allDay: true },
    { id: "ce_005", ownerUserId: IDS.users[0], eventTypeId: holidayType.id, title: "Company Holiday", startDate: new Date(currentYear, currentMonth, 20), endDate: new Date(currentYear, currentMonth, 20), allDay: true },
    { id: "ce_006", ownerUserId: IDS.users[4], eventTypeId: workshopType.id, title: "Tech Debt Planning", startDate: new Date(currentYear, currentMonth, 15, 13, 0), endDate: new Date(currentYear, currentMonth, 15, 16, 0), allDay: false },
    { id: "ce_007", ownerUserId: IDS.users[0], eventTypeId: meetingType.id, title: "Product Sync", startDate: new Date(currentYear, currentMonth + 1, 3, 10, 0), endDate: new Date(currentYear, currentMonth + 1, 3, 12, 0), allDay: false },
    { id: "ce_008", ownerUserId: IDS.users[5], eventTypeId: oooType.id, title: "Andre Vacation", startDate: new Date(currentYear, currentMonth + 1, 10), endDate: new Date(currentYear, currentMonth + 1, 14), allDay: true },
    { id: "ce_009", ownerUserId: IDS.users[1], eventTypeId: meetingType.id, title: "Sprint Review - Platform", startDate: new Date(currentYear, currentMonth + 1, 7, 15, 0), endDate: new Date(currentYear, currentMonth + 1, 7, 16, 0), allDay: false },
    { id: "ce_010", ownerUserId: IDS.users[6], eventTypeId: workshopType.id, title: "React Advanced Patterns", startDate: new Date(currentYear, currentMonth + 1, 18, 10, 0), endDate: new Date(currentYear, currentMonth + 1, 18, 12, 0), allDay: false },
    { id: "ce_011", ownerUserId: IDS.users[1], eventTypeId: meetingType.id, title: "Weekly Standup", startDate: new Date(currentYear, currentMonth, 1, 9, 0), endDate: new Date(currentYear, currentMonth, 1, 9, 15), allDay: false, isRecurring: true, recurrenceFrequency: "WEEKLY", recurrenceDaysOfWeek: [1, 3, 5], recurrenceEndDate: new Date(currentYear, currentMonth + 3, 1) },
  ];

  const results = [];
  for (const ev of events) {
    const result = await prisma.calendarEvent.upsert({
      where: { id: ev.id },
      update: { title: ev.title, startDate: ev.startDate, endDate: ev.endDate },
      create: {
        id: ev.id,
        companyId,
        ownerUserId: ev.ownerUserId,
        eventTypeId: ev.eventTypeId,
        title: ev.title,
        startDate: ev.startDate,
        endDate: ev.endDate,
        allDay: ev.allDay,
        isRecurring: ev.isRecurring ?? false,
        recurrenceFrequency: ev.recurrenceFrequency ?? null,
        recurrenceDaysOfWeek: ev.recurrenceDaysOfWeek ?? [],
        recurrenceEndDate: ev.recurrenceEndDate ?? null,
      },
    });
    results.push(result);
    log(`CalendarEvent: ${result.title} (${result.startDate.toLocaleDateString()})`);
  }
  return results;
}

async function seedLeaveBalances(companyId: string, users: { id: string }[], leaveTypes: Awaited<ReturnType<typeof seedLeaveTypes>>) {
  logSection("Leave Balances");
  const currentYear = new Date().getFullYear();
  let count = 0;

  for (const user of users) {
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.upsert({
        where: { companyId_userId_leaveTypeId_year: { companyId, userId: user.id, leaveTypeId: lt.id, year: currentYear } },
        update: { allocated: lt.defaultAllocation },
        create: {
          companyId,
          userId: user.id,
          leaveTypeId: lt.id,
          year: currentYear,
          allocated: lt.defaultAllocation,
          used: 0,
          adjustment: 0,
          carriedOver: 0,
        },
      });
      count++;
    }
  }
  log(`Created ${count} leave balances for ${users.length} users × ${leaveTypes.length} types`);
}

async function seedLeaveRequests(
  companyId: string,
  users: { id: string }[],
  leaveTypes: Awaited<ReturnType<typeof seedLeaveTypes>>,
  eventTypes: Awaited<ReturnType<typeof seedEventTypes>>
) {
  logSection("Leave Requests");
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const oooType = eventTypes.find((et) => et.name === "Out of Office")!;
  const annualLeave = leaveTypes.find((lt) => lt.name === "Annual Leave")!;
  const sickLeave = leaveTypes.find((lt) => lt.name === "Sick Leave")!;

  const leaveRequests = [
    { eventId: "ce_lr_001", leaveReqId: "lr_001", userId: IDS.users[4], title: "Lisa - Annual Leave", startDate: new Date(currentYear, currentMonth, 22), endDate: new Date(currentYear, currentMonth, 24), leaveTypeId: annualLeave.id, status: "APPROVED" as const, workingDays: 3, reviewerId: IDS.users[1] },
    { eventId: "ce_lr_002", leaveReqId: "lr_002", userId: IDS.users[6], title: "Emily - Sick Leave", startDate: new Date(currentYear, currentMonth, 18), endDate: new Date(currentYear, currentMonth, 18), leaveTypeId: sickLeave.id, status: "APPROVED" as const, workingDays: 1, reviewerId: IDS.users[1] },
    { eventId: "ce_lr_003", leaveReqId: "lr_003", userId: IDS.users[7], title: "Kevin - Annual Leave", startDate: new Date(currentYear, currentMonth + 1, 5), endDate: new Date(currentYear, currentMonth + 1, 9), leaveTypeId: annualLeave.id, status: "PENDING" as const, workingDays: 5, reviewerId: null },
    { eventId: "ce_lr_004", leaveReqId: "lr_004", userId: IDS.users[9], title: "Raj - Sick Leave", startDate: new Date(currentYear, currentMonth, 25), endDate: new Date(currentYear, currentMonth, 25), leaveTypeId: sickLeave.id, status: "REJECTED" as const, workingDays: 1, reviewerId: IDS.users[2] },
    { eventId: "ce_lr_005", leaveReqId: "lr_005", userId: IDS.users[10], title: "Sophie - Annual Leave", startDate: new Date(currentYear, currentMonth + 1, 15), endDate: new Date(currentYear, currentMonth + 1, 19), leaveTypeId: annualLeave.id, status: "PENDING" as const, workingDays: 5, reviewerId: null },
    { eventId: "ce_lr_006", leaveReqId: "lr_006", userId: IDS.users[11], title: "Daniel - Annual Leave", startDate: new Date(currentYear, currentMonth + 1, 20), endDate: new Date(currentYear, currentMonth + 1, 22), leaveTypeId: annualLeave.id, status: "APPROVED" as const, workingDays: 3, reviewerId: IDS.users[2] },
  ];

  for (const lr of leaveRequests) {
    await prisma.calendarEvent.upsert({
      where: { id: lr.eventId },
      update: { title: lr.title, startDate: lr.startDate, endDate: lr.endDate },
      create: {
        id: lr.eventId,
        companyId,
        ownerUserId: lr.userId,
        eventTypeId: oooType.id,
        title: lr.title,
        startDate: lr.startDate,
        endDate: lr.endDate,
        allDay: true,
      },
    });

    await prisma.calendarLeaveRequest.upsert({
      where: { calendarEventId: lr.eventId },
      update: { status: lr.status, workingDays: lr.workingDays, reviewerId: lr.reviewerId },
      create: {
        id: lr.leaveReqId,
        calendarEventId: lr.eventId,
        leaveTypeId: lr.leaveTypeId,
        status: lr.status,
        workingDays: lr.workingDays,
        reviewerId: lr.reviewerId,
        reviewedAt: lr.status !== "PENDING" ? new Date() : null,
        reviewNotes: lr.status === "REJECTED" ? "Insufficient documentation provided" : null,
      },
    });
    log(`LeaveRequest: ${lr.title} — ${lr.status}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════════════════

async function logSummary() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  🎉 Seed complete! Summary:");
  console.log("═══════════════════════════════════════════════════════════════");

  const counts = {
    Companies: await prisma.company.count(),
    Organizations: await prisma.organization.count(),
    OrgUnitTypes: await prisma.organizationUnitType.count(),
    OrgUnits: await prisma.organizationUnit.count(),
    "Positions (V2)": await prisma.position.count(),
    Persons: await prisma.person.count(),
    Users: await prisma.user.count(),
    Employees: await prisma.employee.count(),
    Memberships: await prisma.userCompanyMembership.count(),
    "Roles (V2)": await prisma.role.count(),
    RoleAssignments: await prisma.roleAssignment.count(),
    Features: await prisma.feature.count(),
    ReportingRelationships: await prisma.reportingRelationship.count(),
    EventTypes: await prisma.eventType.count(),
    LeaveTypeConfigs: await prisma.leaveTypeConfig.count(),
    CalendarEvents: await prisma.calendarEvent.count(),
    LeaveBalances: await prisma.leaveBalance.count(),
    LeaveRequests: await prisma.calendarLeaveRequest.count(),
  };

  for (const [entity, count] of Object.entries(counts)) {
    console.log(`  ${entity.padEnd(24)} ${count}`);
  }
  console.log("═══════════════════════════════════════════════════════════════\n");
}

// ─── Test Accounts ────────────────────────────────────────────────────────────

async function seedTestAccounts(companyId: string, organizationId: string) {
  logSection("Test Accounts");

  const accounts = [
    {
      id: "per_superadmin_001",
      userId: "usr_superadmin_001",
      empId: "emp_superadmin_001",
      uin: "SA-001",
      fullName: "Super Admin",
      email: "superadmin@bt.com",
      password: "superadmin",
      isSuperAdmin: true,
    },
    {
      id: "per_manager_001",
      userId: "usr_manager_001",
      empId: "emp_manager_001",
      uin: "MGR-001",
      fullName: "Manager User",
      email: "manager@bt.com",
      password: "manager",
      isSuperAdmin: false,
    },
    {
      id: "per_employee_001",
      userId: "usr_employee_001",
      empId: "emp_employee_001",
      uin: "EMP-001",
      fullName: "Employee User",
      email: "employee@bt.com",
      password: "employee",
      isSuperAdmin: false,
    },
  ];

  for (const acct of accounts) {
    const person = await prisma.person.upsert({
      where: { id: acct.id },
      update: { fullName: acct.fullName, email: acct.email },
      create: {
        id: acct.id,
        fullName: acct.fullName,
        email: acct.email,
        dateOfBirth: new Date(1990, 0, 1),
      },
    });

    const user = await prisma.user.upsert({
      where: { email: acct.email },
      update: {},
      create: {
        id: acct.userId,
        email: acct.email,
        personId: person.id,
      },
    });

    await prisma.employee.upsert({
      where: { uin_organizationId: { uin: acct.uin, organizationId } },
      update: {},
      create: {
        id: acct.empId,
        uin: acct.uin,
        personId: person.id,
        organizationId,
        departmentId: null,
        startDate: new Date(2020, 0, 1),
        status: "ACTIVE",
      },
    });

    await prisma.userCompanyMembership.upsert({
      where: { userId_companyId: { userId: user.id, companyId } },
      update: { isSuperAdmin: acct.isSuperAdmin },
      create: {
        userId: user.id,
        companyId,
        isSuperAdmin: acct.isSuperAdmin,
      },
    });

    log(`${acct.fullName}: ${acct.email} / ${acct.password} (superAdmin: ${acct.isSuperAdmin})`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║          🌱 Strata Platform — Database Seed Script           ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");

  // Company & Organization Structure
  const company = await seedCompany();
  const legacyOrg = await seedLegacyOrganization();
  const orgUnitTypes = await seedOrgUnitTypes(company.id);
  const orgUnits = await seedOrgUnits(company.id, orgUnitTypes);

  // Users, Roles, and Reporting
  const careerLevels = await seedCareerLevels(company.id);
  const positions = await seedPositions(company.id, careerLevels);
  const { users } = await seedUsers(company.id, legacyOrg.id, orgUnits, positions);
  await seedTestAccounts(company.id, legacyOrg.id);
  await seedFeatures();
  const roles = await seedRoles(company.id);
  await seedRoleAssignments(company.id, users, roles);
  await seedReportingRelationships(company.id);

  // Calendar and Leave Data
  const eventTypes = await seedEventTypes(company.id);
  const leaveTypes = await seedLeaveTypes(company.id);
  await seedCalendarEvents(company.id, users, eventTypes);
  await seedLeaveBalances(company.id, users, leaveTypes);
  await seedLeaveRequests(company.id, users, leaveTypes, eventTypes);

  // Summary
  await logSummary();
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
