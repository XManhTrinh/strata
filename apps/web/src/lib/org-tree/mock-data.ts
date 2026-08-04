import { Person, PersonStatus, VacancyNode } from "./types";

let _id = 0;
function id() {
  return `p${++_id}`;
}

let _seed = 42;
function rand() {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed - 1) / 2147483646;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randSalary(base: number) {
  return Math.round(base * (1 + (rand() - 0.5) * 0.3));
}
function randCapacity(): number {
  const v = Math.round(rand() * 100);
  return Math.max(10, Math.min(100, v));
}

const FIRST = [
  "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael",
  "Linda", "David", "Elizabeth", "William", "Barbara", "Sarah", "Karen",
  "Amir", "Priya", "Wei", "Yuki", "Omar", "Fatima", "Raj", "Mei",
  "Carlos", "Sofia", "Liam", "Ava", "Kai", "Luna", "Ravi", "Aisha",
];
const LAST = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Chen", "Wang", "Li", "Zhang",
  "Kumar", "Singh", "Tanaka", "Suzuki", "Patel", "Kim",
];
function nextName() {
  return `${pick(FIRST)} ${pick(LAST)}`;
}

const DEPT_NAMES: Record<string, string> = {
  executive: "Executive",
  engineering: "Engineering",
  product: "Product",
  design: "Design",
};

const persons: Person[] = [];

function add(
  title: string,
  squads: string[],
  salary: number,
  parentId: string | null,
  departmentId?: string,
  overrides?: Partial<Pick<Person, "status" | "capacityAllocation" | "temporary" | "canEdit" | "startDate">>
): string {
  const pid = id();
  const status: PersonStatus = overrides?.status ?? "ACTIVE";
  const capacityAllocation = overrides?.capacityAllocation ?? randCapacity();
  persons.push({
    id: pid,
    fullName: nextName(),
    title,
    squads,
    salary: randSalary(salary),
    parentId,
    departmentId,
    departmentName: departmentId ? DEPT_NAMES[departmentId] : undefined,
    positionTitle: title,
    uin: `UIN-${pid}`,
    status,
    capacityAllocation,
    temporary: overrides?.temporary,
    canEdit: overrides?.canEdit,
    startDate: overrides?.startDate ?? "2022-01-15",
  });
  return pid;
}

// Level 0: CEO
const ceo = add("CEO", [], 400000, null, "executive", { canEdit: false, capacityAllocation: 95 });

// Level 1: C-suite
const cto = add("CTO", [], 320000, ceo, "engineering", { capacityAllocation: 88 });
const cpo = add("Chief Product Officer", [], 300000, ceo, "product", { capacityAllocation: 75 });
const cdo = add("Chief Design Officer", [], 290000, ceo, "design", { status: "ON_LEAVE", capacityAllocation: 0 });

// Level 2: VPs / Senior Managers
const vpEng = add("VP Engineering", [], 260000, cto, "engineering", { capacityAllocation: 92 });
const vpQA = add("VP Quality", [], 240000, cto, "engineering", { capacityAllocation: 70 });

// Level 3: Engineering Managers (per squad pair)
const emDiscovery = add("Engineering Manager", ["PLP", "PDP", "Search"], 190000, vpEng, "engineering", { capacityAllocation: 85 });
const emCommerce = add("Engineering Manager", ["Checkout", "Basket", "Order Management"], 190000, vpEng, "engineering", { capacityAllocation: 78 });
const emGrowth = add("Engineering Manager", ["Navigation", "Learn", "Cross-sell"], 190000, vpEng, "engineering", { status: "SUSPENDED", capacityAllocation: 0 });
const emPlatform = add("Engineering Manager", ["L2"], 185000, vpEng, "engineering", { capacityAllocation: 60 });

// Level 3: Product Owners
add("Product Owner", ["PLP", "Search"], 160000, cpo, "product", { capacityAllocation: 80 });
add("Product Owner", ["Checkout", "Order Management"], 160000, cpo, "product", { capacityAllocation: 65 });
add("Product Owner", ["Navigation", "Learn"], 155000, cpo, "product", { temporary: true, capacityAllocation: 50, startDate: "2024-06-01" });

// Level 3: Designers
add("Lead Designer", ["PLP", "PDP"], 150000, cdo, "design", { capacityAllocation: 90 });
add("Designer", ["Checkout", "Basket"], 140000, cdo, "design", { capacityAllocation: 55 });

// Level 4: Devs under Discovery EM
add("Lead Developer", ["PLP"], 175000, emDiscovery, "engineering", { capacityAllocation: 95 });
add("Senior Developer", ["PDP"], 155000, emDiscovery, "engineering", { capacityAllocation: 72 });
add("Developer", ["Search"], 135000, emDiscovery, "engineering", { capacityAllocation: 45 });
add("Developer", ["PLP"], 135000, emDiscovery, "engineering", { temporary: true, capacityAllocation: 100, startDate: "2024-09-01" });

// Level 4: Devs under Commerce EM
add("Lead Developer", ["Checkout"], 175000, emCommerce, "engineering", { capacityAllocation: 88 });
add("Senior Developer", ["Basket"], 155000, emCommerce, "engineering", { capacityAllocation: 70 });
add("Developer", ["Order Management"], 135000, emCommerce, "engineering", { capacityAllocation: 60 });
add("Developer", ["Checkout"], 130000, emCommerce, "engineering", { status: "ON_LEAVE", capacityAllocation: 0 });

// Level 4: Devs under Growth EM
add("Lead Developer", ["Navigation"], 175000, emGrowth, "engineering", { capacityAllocation: 82 });
add("Developer", ["Learn"], 135000, emGrowth, "engineering", { capacityAllocation: 50 });
add("Developer", ["Cross-sell"], 135000, emGrowth, "engineering", { capacityAllocation: 40 });

// Level 4: Devs under Platform EM
add("Lead Developer", ["L2"], 175000, emPlatform, "engineering", { capacityAllocation: 90 });
add("Developer", ["L2"], 135000, emPlatform, "engineering", { capacityAllocation: 65 });

// Level 4: QA under VP QA
add("QA Lead", ["PLP", "Search"], 160000, vpQA, "engineering", { capacityAllocation: 75 });
add("QA Engineer", ["Checkout", "Basket"], 130000, vpQA, "engineering", { capacityAllocation: 55 });
add("QA Engineer", ["Navigation"], 130000, vpQA, "engineering", { status: "TERMINATED", capacityAllocation: 0 });

// Unallocated persons (no parent)
add("Developer", [], 120000, null, undefined, { capacityAllocation: 0 });
add("Senior Developer", [], 145000, null, undefined, { capacityAllocation: 0 });
add("Designer", [], 130000, null, undefined, { capacityAllocation: 0 });
add("QA Engineer", [], 125000, null, undefined, { capacityAllocation: 0 });

export const seedPersons: Person[] = persons;

export const MOCK_VACANCIES: VacancyNode[] = [
  {
    id: "vacancy-1",
    title: "Senior Frontend Developer",
    departmentId: "engineering",
    departmentName: "Engineering",
    level: 4,
  },
  {
    id: "vacancy-2",
    title: "Staff Backend Engineer",
    departmentId: "engineering",
    departmentName: "Engineering",
    level: 4,
  },
  {
    id: "vacancy-3",
    title: "Product Designer",
    departmentId: "design",
    departmentName: "Design",
    level: 3,
  },
  {
    id: "vacancy-4",
    title: "Engineering Manager - Data",
    departmentId: "engineering",
    departmentName: "Engineering",
    level: 3,
  },
  {
    id: "vacancy-5",
    title: "Senior Product Owner",
    departmentId: "product",
    departmentName: "Product",
    level: 3,
  },
];
