import { PrismaClient, PermissionScopeV2 } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// ─── Deterministic IDs for idempotency ────────────────────────────────────────

const IDS = {
  company: "cm_acme_corp_001",
  legacyOrg: "org_acme_legacy_001",
  // Org Unit Types
  orgUnitTypes: {
    department: "out_department_001",
    tribe: "out_tribe_001",
    squad: "out_squad_001",
  },
  // Org Units
  orgUnits: {
    engineering: "ou_engineering_001",
    product: "ou_product_001",
    design: "ou_design_001",
    platformTribe: "ou_platform_tribe_001",
    productTribe: "ou_product_tribe_001",
    infraSquad: "ou_infra_squad_001",
    webSquad: "ou_web_squad_001",
  },
  // Positions
  positions: {
    softwareEngineer: "pos_sw_eng_001",
    seniorEngineer: "pos_sr_eng_001",
    engineeringManager: "pos_eng_mgr_001",
    productManager: "pos_prod_mgr_001",
    designer: "pos_designer_001",
    cto: "pos_cto_001",
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
  // Users (Person, User, Employee share index)
  persons: [
    "per_001", "per_002", "per_003", "per_004", "per_005",
    "per_006", "per_007", "per_008", "per_009", "per_010",
    "per_011", "per_012",
  ],
  users: [
    "usr_001", "usr_002", "usr_003", "usr_004", "usr_005",
    "usr_006", "usr_007", "usr_008", "usr_009", "usr_010",
    "usr_011", "usr_012",
  ],
  employees: [
    "emp_001", "emp_002", "emp_003", "emp_004", "emp_005",
    "emp_006", "emp_007", "emp_008", "emp_009", "emp_010",
    "emp_011", "emp_012",
  ],
  // Legacy departments
  departments: {
    engineering: "dept_engineering_001",
    product: "dept_product_001",
    design: "dept_design_001",
  },
  // Legacy positions
  legacyPositions: {
    softwareEngineer: "lpos_sw_eng_001",
    engineeringManager: "lpos_eng_mgr_001",
    productManager: "lpos_prod_mgr_001",
  },
  // Engineering hierarchy
  tribes: {
    platform: "tribe_platform_001",
    product: "tribe_product_001",
  },
  clusters: {
    infrastructure: "cluster_infra_001",
    frontend: "cluster_frontend_001",
    backend: "cluster_backend_001",
  },
  squads: {
    cloudInfra: "squad_cloud_infra_001",
    devTools: "squad_dev_tools_001",
    webApp: "squad_web_app_001",
    mobileApp: "squad_mobile_001",
  },
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
  { firstName: "Marcus", lastName: "Williams", email: "marcus.williams@strata.io", role: "Engineering Manager" },
  { firstName: "Priya", lastName: "Patel", email: "priya.patel@strata.io", role: "Engineering Manager" },
  { firstName: "James", lastName: "O'Brien", email: "james.obrien@strata.io", role: "Product Manager" },
  { firstName: "Lisa", lastName: "Nakamura", email: "lisa.nakamura@strata.io", role: "Senior Engineer" },
  { firstName: "Andre", lastName: "Santos", email: "andre.santos@strata.io", role: "Software Engineer" },
  { firstName: "Emily", lastName: "Richardson", email: "emily.richardson@strata.io", role: "Software Engineer" },
  { firstName: "Kevin", lastName: "Zhao", email: "kevin.zhao@strata.io", role: "Software Engineer" },
  { firstName: "Maya", lastName: "Johansson", email: "maya.johansson@strata.io", role: "Designer" },
  { firstName: "Raj", lastName: "Krishnamurthy", email: "raj.krishnamurthy@strata.io", role: "Software Engineer" },
  { firstName: "Sophie", lastName: "Dubois", email: "sophie.dubois@strata.io", role: "Software Engineer" },
  { firstName: "Daniel", lastName: "Kim", email: "daniel.kim@strata.io", role: "Software Engineer" },
];


// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6.1 — Company & Organization Structure
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
  logSection("Legacy Organization");
  const org = await prisma.organization.upsert({
    where: { id: IDS.legacyOrg },
    update: { name: "Strata Technologies" },
    create: {
      id: IDS.legacyOrg,
      name: "Strata Technologies",
    },
  });
  log(`Legacy Organization: ${org.name} (${org.id})`);
  return org;
}

async function seedOrgUnitTypes(companyId: string) {
  logSection("Organization Unit Types");
  const types = [
    { id: IDS.orgUnitTypes.department, name: "Department", description: "Top-level organizational division", icon: "building", color: "#3B82F6", displayOrder: 1 },
    { id: IDS.orgUnitTypes.tribe, name: "Tribe", description: "Cross-functional group of squads", icon: "users", color: "#8B5CF6", displayOrder: 2 },
    { id: IDS.orgUnitTypes.squad, name: "Squad", description: "Autonomous delivery team", icon: "user-group", color: "#10B981", displayOrder: 3 },
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
  const squadType = types.find((t) => t.name === "Squad")!;

  // Level 1 — Departments (root)
  const units = [
    { id: IDS.orgUnits.engineering, typeId: deptType.id, name: "Engineering", code: "ENG", parentId: null, path: `/${IDS.orgUnits.engineering}`, sortOrder: 1 },
    { id: IDS.orgUnits.product, typeId: deptType.id, name: "Product & Strategy", code: "PROD", parentId: null, path: `/${IDS.orgUnits.product}`, sortOrder: 2 },
    { id: IDS.orgUnits.design, typeId: deptType.id, name: "Design & UX", code: "DSG", parentId: null, path: `/${IDS.orgUnits.design}`, sortOrder: 3 },
    // Level 2 — Tribes under Engineering
    { id: IDS.orgUnits.platformTribe, typeId: tribeType.id, name: "Platform Infrastructure", code: "PLAT", parentId: IDS.orgUnits.engineering, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.platformTribe}`, sortOrder: 1 },
    { id: IDS.orgUnits.productTribe, typeId: tribeType.id, name: "Growth & Engagement", code: "GRWTH", parentId: IDS.orgUnits.engineering, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.productTribe}`, sortOrder: 2 },
    // Level 3 — Squads under Platform Tribe
    { id: IDS.orgUnits.infraSquad, typeId: squadType.id, name: "Cloud Services", code: "CLOUD", parentId: IDS.orgUnits.platformTribe, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.platformTribe}/${IDS.orgUnits.infraSquad}`, sortOrder: 1 },
    { id: IDS.orgUnits.webSquad, typeId: squadType.id, name: "Feed & Discovery", code: "FEED", parentId: IDS.orgUnits.productTribe, path: `/${IDS.orgUnits.engineering}/${IDS.orgUnits.productTribe}/${IDS.orgUnits.webSquad}`, sortOrder: 1 },
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
// TASK 6.2 — Users, Roles, and Reporting
// ═══════════════════════════════════════════════════════════════════════════════

async function seedLegacyDepartments(organizationId: string) {
  logSection("Legacy Departments");
  const departments = [
    { id: IDS.departments.engineering, name: "Engineering", organizationId },
    { id: IDS.departments.product, name: "Product", organizationId },
    { id: IDS.departments.design, name: "Design", organizationId },
  ];

  const results = [];
  for (const dept of departments) {
    const result = await prisma.department.upsert({
      where: { id: dept.id },
      update: { name: dept.name },
      create: { id: dept.id, name: dept.name, organizationId: dept.organizationId },
    });
    results.push(result);
    log(`Department: ${result.name}`);
  }
  return results;
}

async function seedLegacyPositions(departments: Awaited<ReturnType<typeof seedLegacyDepartments>>) {
  logSection("Legacy Positions");
  const engDept = departments.find((d) => d.name === "Engineering")!;
  const prodDept = departments.find((d) => d.name === "Product")!;

  const positions = [
    { id: IDS.legacyPositions.softwareEngineer, title: "Software Engineer", level: 3, departmentId: engDept.id },
    { id: IDS.legacyPositions.engineeringManager, title: "Engineering Manager", level: 5, departmentId: engDept.id },
    { id: IDS.legacyPositions.productManager, title: "Product Manager", level: 4, departmentId: prodDept.id },
  ];

  const results = [];
  for (const pos of positions) {
    const result = await prisma.position.upsert({
      where: { id: pos.id },
      update: { title: pos.title, level: pos.level },
      create: { id: pos.id, title: pos.title, level: pos.level, departmentId: pos.departmentId },
    });
    results.push(result);
    log(`Legacy Position: ${result.title}`);
  }
  return results;
}

async function seedPositions(companyId: string) {
  logSection("Positions (V2)");
  const positions = [
    { id: IDS.positions.softwareEngineer, name: "Software Engineer", careerLevel: 3, canHaveDirectReports: false },
    { id: IDS.positions.seniorEngineer, name: "Senior Engineer", careerLevel: 4, canHaveDirectReports: false },
    { id: IDS.positions.engineeringManager, name: "Engineering Manager", careerLevel: 5, canHaveDirectReports: true },
    { id: IDS.positions.productManager, name: "Product Manager", careerLevel: 4, canHaveDirectReports: false },
    { id: IDS.positions.designer, name: "Designer", careerLevel: 3, canHaveDirectReports: false },
    { id: IDS.positions.cto, name: "CTO", careerLevel: 7, canHaveDirectReports: true },
  ];

  const results = [];
  for (const pos of positions) {
    const result = await prisma.positionV2.upsert({
      where: { companyId_name: { companyId, name: pos.name } },
      update: { careerLevel: pos.careerLevel, canHaveDirectReports: pos.canHaveDirectReports },
      create: { id: pos.id, companyId, name: pos.name, careerLevel: pos.careerLevel, canHaveDirectReports: pos.canHaveDirectReports },
    });
    results.push(result);
    log(`PositionV2: ${result.name}`);
  }
  return results;
}

async function seedUsers(
  companyId: string,
  organizationId: string,
  orgUnits: Awaited<ReturnType<typeof seedOrgUnits>>,
  positions: Awaited<ReturnType<typeof seedPositions>>,
  departments: Awaited<ReturnType<typeof seedLegacyDepartments>>
) {
  logSection("Users (Person + User + Employee + Membership)");
  const passwordHash = await bcrypt.hash("Test1234!", 10);

  const engDept = departments.find((d) => d.name === "Engineering")!;
  const prodDept = departments.find((d) => d.name === "Product")!;
  const desDept = departments.find((d) => d.name === "Design")!;

  const posMap: Record<string, string> = {
    CTO: IDS.positions.cto,
    "Engineering Manager": IDS.positions.engineeringManager,
    "Product Manager": IDS.positions.productManager,
    "Senior Engineer": IDS.positions.seniorEngineer,
    "Software Engineer": IDS.positions.softwareEngineer,
    Designer: IDS.positions.designer,
  };

  const orgUnitMap: Record<string, string> = {
    CTO: IDS.orgUnits.engineering,
    "Engineering Manager": IDS.orgUnits.engineering,
    "Product Manager": IDS.orgUnits.product,
    "Senior Engineer": IDS.orgUnits.platformTribe,
    "Software Engineer": IDS.orgUnits.infraSquad,
    Designer: IDS.orgUnits.design,
  };

  const deptMap: Record<string, string> = {
    CTO: engDept.id,
    "Engineering Manager": engDept.id,
    "Product Manager": prodDept.id,
    "Senior Engineer": engDept.id,
    "Software Engineer": engDept.id,
    Designer: desDept.id,
  };

  const users = [];
  const employees = [];

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
      update: { passwordHash },
      create: {
        id: userId,
        email: u.email,
        passwordHash,
        personId: person.id,
      },
    });
    users.push(user);

    // Upsert Employee (linked to legacy Organization)
    const employee = await prisma.employee.upsert({
      where: { uin_organizationId: { uin: `ACM-${String(1000 + i)}`, organizationId } },
      update: { departmentId: deptMap[u.role] },
      create: {
        id: employeeId,
        uin: `ACM-${String(1000 + i)}`,
        personId: person.id,
        organizationId,
        departmentId: deptMap[u.role],
        startDate: new Date(2022, i % 12, 1),
        status: "ACTIVE",
      },
    });
    employees.push(employee);

    // Upsert UserCompanyMembership
    await prisma.userCompanyMembership.upsert({
      where: { userId_companyId: { userId: user.id, companyId } },
      update: { positionId: posMap[u.role], orgUnitId: orgUnitMap[u.role] },
      create: {
        userId: user.id,
        companyId,
        positionId: posMap[u.role],
        orgUnitId: orgUnitMap[u.role],
        isSuperAdmin: u.role === "CTO",
      },
    });

    log(`User: ${u.firstName} ${u.lastName} (${u.email}) — ${u.role}`);
  }

  return { users, employees };
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
    const role = await prisma.roleV2.upsert({
      where: { companyId_name: { companyId, name: r.name } },
      update: { description: r.description },
      create: { id: r.id, companyId, name: r.name, description: r.description, isSystem: r.isSystem },
    });
    results.push(role);
    log(`RoleV2: ${role.name}`);
  }

  // Assign permissions to roles — covering all 6 PermissionScopeV2 values
  const allPermIds = Object.values(IDS.featurePermissions);
  const scopeAssignments: Array<{ roleId: string; featurePermissionId: string; scope: PermissionScopeV2 }> = [
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
    await prisma.rolePermissionAssignment.upsert({
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
    { userId: IDS.users[1], roleId: managerRole.id },   // Marcus (Eng Mgr) → Manager
    { userId: IDS.users[2], roleId: managerRole.id },   // Priya (Eng Mgr) → Manager
    { userId: IDS.users[3], roleId: managerRole.id },   // James (PM) → Manager
    { userId: IDS.users[4], roleId: employeeRole.id },  // Lisa → Employee
    { userId: IDS.users[5], roleId: employeeRole.id },  // Andre → Employee
    { userId: IDS.users[6], roleId: employeeRole.id },  // Emily → Employee
    { userId: IDS.users[7], roleId: employeeRole.id },  // Kevin → Employee
    { userId: IDS.users[8], roleId: employeeRole.id },  // Maya → Employee
    { userId: IDS.users[9], roleId: employeeRole.id },  // Raj → Employee
    { userId: IDS.users[10], roleId: employeeRole.id }, // Sophie → Employee
    { userId: IDS.users[11], roleId: employeeRole.id }, // Daniel → Employee
  ];

  for (const a of assignments) {
    const membership = await prisma.userCompanyMembership.findUnique({
      where: { userId_companyId: { userId: a.userId, companyId } },
    });
    if (membership) {
      await prisma.roleAssignmentV2.upsert({
        where: { membershipId_roleId: { membershipId: membership.id, roleId: a.roleId } },
        update: {},
        create: { membershipId: membership.id, roleId: a.roleId, assignedBy: IDS.users[0] },
      });
    }
  }
  log(`Assigned ${assignments.length} user-role mappings`);
}

async function seedReportingRelationships(companyId: string) {
  logSection("Reporting Relationships");
  // Sarah (CTO) manages Marcus and Priya (Eng Managers)
  // Marcus manages Lisa, Andre, Emily
  // Priya manages Kevin, Raj, Sophie, Daniel
  const relationships = [
    { userId: IDS.users[1], managerId: IDS.users[0] }, // Marcus → Sarah
    { userId: IDS.users[2], managerId: IDS.users[0] }, // Priya → Sarah
    { userId: IDS.users[3], managerId: IDS.users[0] }, // James → Sarah
    { userId: IDS.users[4], managerId: IDS.users[1] }, // Lisa → Marcus
    { userId: IDS.users[5], managerId: IDS.users[1] }, // Andre → Marcus
    { userId: IDS.users[6], managerId: IDS.users[1] }, // Emily → Marcus
    { userId: IDS.users[7], managerId: IDS.users[2] }, // Kevin → Priya
    { userId: IDS.users[8], managerId: IDS.users[3] }, // Maya → James
    { userId: IDS.users[9], managerId: IDS.users[2] }, // Raj → Priya
    { userId: IDS.users[10], managerId: IDS.users[2] }, // Sophie → Priya
    { userId: IDS.users[11], managerId: IDS.users[2] }, // Daniel → Priya
  ];

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
// TASK 6.3 — Calendar and Leave Data
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

  const events = [
    // Current month events
    { id: "ce_001", ownerUserId: IDS.users[0], eventTypeId: meetingType.id, title: "Engineering All-Hands", startDate: new Date(currentYear, currentMonth, 5, 10, 0), endDate: new Date(currentYear, currentMonth, 5, 11, 0), allDay: false },
    { id: "ce_002", ownerUserId: IDS.users[1], eventTypeId: meetingType.id, title: "Sprint Review - Platform", startDate: new Date(currentYear, currentMonth, 8, 9, 0), endDate: new Date(currentYear, currentMonth, 8, 10, 30), allDay: false },
    { id: "ce_003", ownerUserId: IDS.users[2], eventTypeId: meetingType.id, title: "Design Crit", startDate: new Date(currentYear, currentMonth, 10, 14, 0), endDate: new Date(currentYear, currentMonth, 10, 15, 0), allDay: false },
    { id: "ce_004", ownerUserId: IDS.users[3], eventTypeId: oooType.id, title: "James OOO - Conference", startDate: new Date(currentYear, currentMonth, 12), endDate: new Date(currentYear, currentMonth, 14), allDay: true },
    { id: "ce_005", ownerUserId: IDS.users[0], eventTypeId: holidayType.id, title: "Company Holiday", startDate: new Date(currentYear, currentMonth, 20), endDate: new Date(currentYear, currentMonth, 20), allDay: true },
    { id: "ce_006", ownerUserId: IDS.users[4], eventTypeId: workshopType.id, title: "Tech Debt Planning", startDate: new Date(currentYear, currentMonth, 15, 13, 0), endDate: new Date(currentYear, currentMonth, 15, 16, 0), allDay: false },
    // Next month events
    { id: "ce_007", ownerUserId: IDS.users[0], eventTypeId: meetingType.id, title: "Product Sync", startDate: new Date(currentYear, currentMonth + 1, 3, 10, 0), endDate: new Date(currentYear, currentMonth + 1, 3, 12, 0), allDay: false },
    { id: "ce_008", ownerUserId: IDS.users[5], eventTypeId: oooType.id, title: "Andre Vacation", startDate: new Date(currentYear, currentMonth + 1, 10), endDate: new Date(currentYear, currentMonth + 1, 14), allDay: true },
    { id: "ce_009", ownerUserId: IDS.users[1], eventTypeId: meetingType.id, title: "Sprint Review - Platform", startDate: new Date(currentYear, currentMonth + 1, 7, 15, 0), endDate: new Date(currentYear, currentMonth + 1, 7, 16, 0), allDay: false },
    { id: "ce_010", ownerUserId: IDS.users[6], eventTypeId: workshopType.id, title: "React Advanced Patterns", startDate: new Date(currentYear, currentMonth + 1, 18, 10, 0), endDate: new Date(currentYear, currentMonth + 1, 18, 12, 0), allDay: false },
    // Recurring event (weekly standup)
    { id: "ce_011", ownerUserId: IDS.users[1], eventTypeId: meetingType.id, title: "Weekly Standup", startDate: new Date(currentYear, currentMonth, 1, 9, 0), endDate: new Date(currentYear, currentMonth, 1, 9, 15), allDay: false, isRecurring: true, recurrenceFrequency: "WEEKLY" as const, recurrenceDaysOfWeek: [1, 3, 5], recurrenceEndDate: new Date(currentYear, currentMonth + 3, 1) },
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
        recurrenceFrequency: (ev as any).recurrenceFrequency ?? null,
        recurrenceDaysOfWeek: (ev as any).recurrenceDaysOfWeek ?? [],
        recurrenceEndDate: (ev as any).recurrenceEndDate ?? null,
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
    // Create a CalendarEvent for the leave request
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

    // Create the CalendarLeaveRequest
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
// TASK 6.4 — Engineering, Capacity, and Budgets
// ═══════════════════════════════════════════════════════════════════════════════

async function seedEngineering(organizationId: string) {
  logSection("Engineering Hierarchy (Tribes → Clusters → Squads)");

  // Tribes
  const tribes = [
    { id: IDS.tribes.platform, name: "Platform Infrastructure", organizationId },
    { id: IDS.tribes.product, name: "Growth & Engagement", organizationId },
  ];
  const tribeResults = [];
  for (const t of tribes) {
    const result = await prisma.tribe.upsert({
      where: { id: t.id },
      update: { name: t.name },
      create: { id: t.id, name: t.name, organizationId: t.organizationId },
    });
    tribeResults.push(result);
    log(`Tribe: ${result.name}`);
  }

  // Clusters
  const clusters = [
    { id: IDS.clusters.infrastructure, name: "Infrastructure", tribeId: IDS.tribes.platform },
    { id: IDS.clusters.frontend, name: "Frontend", tribeId: IDS.tribes.product },
    { id: IDS.clusters.backend, name: "Backend", tribeId: IDS.tribes.product },
  ];
  const clusterResults = [];
  for (const c of clusters) {
    const result = await prisma.cluster.upsert({
      where: { id: c.id },
      update: { name: c.name },
      create: { id: c.id, name: c.name, tribeId: c.tribeId },
    });
    clusterResults.push(result);
    log(`Cluster: ${result.name} (${tribes.find((t) => t.id === c.tribeId)?.name})`);
  }

  // Squads
  const squads = [
    { id: IDS.squads.cloudInfra, name: "Cloud Services", clusterId: IDS.clusters.infrastructure },
    { id: IDS.squads.devTools, name: "Developer Experience", clusterId: IDS.clusters.infrastructure },
    { id: IDS.squads.webApp, name: "Feed & Discovery", clusterId: IDS.clusters.frontend },
    { id: IDS.squads.mobileApp, name: "Messaging Platform", clusterId: IDS.clusters.backend },
  ];
  const squadResults = [];
  for (const s of squads) {
    const result = await prisma.squad.upsert({
      where: { id: s.id },
      update: { name: s.name },
      create: { id: s.id, name: s.name, clusterId: s.clusterId },
    });
    squadResults.push(result);
    log(`Squad: ${result.name}`);
  }

  return { tribes: tribeResults, clusters: clusterResults, squads: squadResults };
}

async function seedTeamMemberships(employees: { id: string }[], squads: { id: string; name: string }[]) {
  logSection("Team Memberships");

  // Assign employees to squads with roles
  // employees[4] (Lisa) — Cloud Services, Senior
  // employees[5] (Andre) — Cloud Services
  // employees[6] (Emily) — Feed & Discovery
  // employees[7] (Kevin) — Feed & Discovery
  // employees[8] (Maya) — Feed & Discovery (designer)
  // employees[9] (Raj) — Developer Experience
  // employees[10] (Sophie) — Developer Experience
  // employees[11] (Daniel) — Messaging Platform
  const memberships = [
    { employeeId: employees[4].id, squadId: IDS.squads.cloudInfra, role: "Tech Lead" },
    { employeeId: employees[5].id, squadId: IDS.squads.cloudInfra, role: "Engineer" },
    { employeeId: employees[6].id, squadId: IDS.squads.webApp, role: "Engineer" },
    { employeeId: employees[7].id, squadId: IDS.squads.webApp, role: "Engineer" },
    { employeeId: employees[8].id, squadId: IDS.squads.webApp, role: "Designer" },
    { employeeId: employees[9].id, squadId: IDS.squads.devTools, role: "Tech Lead" },
    { employeeId: employees[10].id, squadId: IDS.squads.devTools, role: "Engineer" },
    { employeeId: employees[11].id, squadId: IDS.squads.mobileApp, role: "Engineer" },
  ];

  for (const m of memberships) {
    await prisma.teamMembership.upsert({
      where: { employeeId_squadId: { employeeId: m.employeeId, squadId: m.squadId } },
      update: { role: m.role },
      create: { employeeId: m.employeeId, squadId: m.squadId, role: m.role },
    });
  }
  log(`Assigned ${memberships.length} team memberships`);
}

async function seedCapacityAllocations(employees: { id: string }[], squads: { id: string }[]) {
  logSection("Capacity Allocations");

  // Each employee's allocations sum to 100%
  const allocations = [
    { employeeId: employees[4].id, squadId: IDS.squads.cloudInfra, percentage: 100 },
    { employeeId: employees[5].id, squadId: IDS.squads.cloudInfra, percentage: 100 },
    { employeeId: employees[6].id, squadId: IDS.squads.webApp, percentage: 100 },
    { employeeId: employees[7].id, squadId: IDS.squads.webApp, percentage: 80 },
    { employeeId: employees[7].id, squadId: IDS.squads.mobileApp, percentage: 20 },
    { employeeId: employees[8].id, squadId: IDS.squads.webApp, percentage: 60 },
    { employeeId: employees[8].id, squadId: IDS.squads.mobileApp, percentage: 40 },
    { employeeId: employees[9].id, squadId: IDS.squads.devTools, percentage: 100 },
    { employeeId: employees[10].id, squadId: IDS.squads.devTools, percentage: 70 },
    { employeeId: employees[10].id, squadId: IDS.squads.cloudInfra, percentage: 30 },
    { employeeId: employees[11].id, squadId: IDS.squads.mobileApp, percentage: 100 },
  ];

  for (const a of allocations) {
    await prisma.capacityAllocation.upsert({
      where: { employeeId_squadId: { employeeId: a.employeeId, squadId: a.squadId } },
      update: { percentage: a.percentage },
      create: { employeeId: a.employeeId, squadId: a.squadId, percentage: a.percentage },
    });
  }
  log(`Created ${allocations.length} capacity allocations`);
}

async function seedBudgets(departments: { id: string; name: string }[]) {
  logSection("Budgets");
  const fiscalPeriods = ["FY2024-Q3", "FY2024-Q4"];
  const budgetAmounts: Record<string, Record<string, number>> = {
    Engineering: { "FY2024-Q3": 1050000, "FY2024-Q4": 1050000 },
    Product: { "FY2024-Q3": 425000, "FY2024-Q4": 425000 },
    Design: { "FY2024-Q3": 310000, "FY2024-Q4": 310000 },
  };

  let count = 0;
  for (const dept of departments) {
    for (const period of fiscalPeriods) {
      const amount = budgetAmounts[dept.name]?.[period] ?? 100000;
      // Use a deterministic id based on dept + period
      const budgetId = `budget_${dept.id}_${period.replace(/[^a-zA-Z0-9]/g, "")}`;
      await prisma.budget.upsert({
        where: { id: budgetId },
        update: { amount, fiscalPeriod: period },
        create: {
          id: budgetId,
          departmentId: dept.id,
          fiscalPeriod: period,
          amount,
        },
      });
      count++;
      log(`Budget: ${dept.name} ${period} — $${amount.toLocaleString()}`);
    }
  }
  log(`Created ${count} budget records`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6.5 — Main entry point with completion logging
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
    Departments: await prisma.department.count(),
    "Positions (V2)": await prisma.positionV2.count(),
    Persons: await prisma.person.count(),
    Users: await prisma.user.count(),
    Employees: await prisma.employee.count(),
    Memberships: await prisma.userCompanyMembership.count(),
    "Roles (V2)": await prisma.roleV2.count(),
    RoleAssignments: await prisma.roleAssignmentV2.count(),
    Features: await prisma.feature.count(),
    ReportingRelationships: await prisma.reportingRelationship.count(),
    EventTypes: await prisma.eventType.count(),
    LeaveTypeConfigs: await prisma.leaveTypeConfig.count(),
    CalendarEvents: await prisma.calendarEvent.count(),
    LeaveBalances: await prisma.leaveBalance.count(),
    LeaveRequests: await prisma.calendarLeaveRequest.count(),
    Tribes: await prisma.tribe.count(),
    Clusters: await prisma.cluster.count(),
    Squads: await prisma.squad.count(),
    TeamMemberships: await prisma.teamMembership.count(),
    CapacityAllocations: await prisma.capacityAllocation.count(),
    Budgets: await prisma.budget.count(),
  };

  for (const [entity, count] of Object.entries(counts)) {
    console.log(`  ${entity.padEnd(24)} ${count}`);
  }
  console.log("═══════════════════════════════════════════════════════════════\n");
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║          🌱 Strata Platform — Database Seed Script           ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");

  // 6.1 — Company & Organization Structure
  const company = await seedCompany();
  const legacyOrg = await seedLegacyOrganization();
  const orgUnitTypes = await seedOrgUnitTypes(company.id);
  const orgUnits = await seedOrgUnits(company.id, orgUnitTypes);

  // 6.2 — Users, Roles, and Reporting
  const departments = await seedLegacyDepartments(legacyOrg.id);
  await seedLegacyPositions(departments);
  const positions = await seedPositions(company.id);
  const { users, employees } = await seedUsers(company.id, legacyOrg.id, orgUnits, positions, departments);
  await seedFeatures();
  const roles = await seedRoles(company.id);
  await seedRoleAssignments(company.id, users, roles);
  await seedReportingRelationships(company.id);

  // 6.3 — Calendar and Leave Data
  const eventTypes = await seedEventTypes(company.id);
  const leaveTypes = await seedLeaveTypes(company.id);
  await seedCalendarEvents(company.id, users, eventTypes);
  await seedLeaveBalances(company.id, users, leaveTypes);
  await seedLeaveRequests(company.id, users, leaveTypes, eventTypes);

  // 6.4 — Engineering, Capacity, and Budgets
  const { squads } = await seedEngineering(legacyOrg.id);
  await seedTeamMemberships(employees, squads);
  await seedCapacityAllocations(employees, squads);
  await seedBudgets(departments);

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
