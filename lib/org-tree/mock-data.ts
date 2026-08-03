import { Person } from './types';
import { ALL_SQUADS } from './squads';

let _id = 0;
function id() { return `p${++_id}`; }
function avatar(pid: string) { return `https://i.pravatar.cc/150?u=${pid}`; }

let _seed = 12345;
function rand() { _seed = (_seed * 16807 + 0) % 2147483647; return (_seed - 1) / 2147483646; }
function pick<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(rand() * (max - min + 1)) + min; }
function randSalary(base: number) { return Math.round(base * (1 + (rand() - 0.5) * 0.3)); }

const FIRST = [
  'James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','David','Elizabeth',
  'William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Christopher','Karen',
  'Charles','Lisa','Daniel','Nancy','Matthew','Betty','Anthony','Margaret','Mark','Sandra',
  'Donald','Ashley','Steven','Kimberly','Paul','Emily','Andrew','Donna','Joshua','Michelle',
  'Kenneth','Carol','Kevin','Amanda','Brian','Dorothy','George','Melissa','Timothy','Deborah',
  'Amir','Priya','Wei','Yuki','Omar','Fatima','Raj','Mei','Carlos','Sofia',
  'Liam','Ava','Kai','Luna','Ravi','Aisha','Sven','Ingrid','Marco','Elena',
  'Noah','Emma','Ethan','Olivia','Lucas','Sophia','Mason','Isabella','Logan','Mia',
];
const LAST = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
  'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
  'Chen','Wang','Li','Zhang','Kumar','Singh','Sharma','Gupta','Muller','Schmidt',
  'Tanaka','Suzuki','Johansson','Eriksson','Larsson','Patel','Kim','Park','Nakamura','Watanabe',
];
function nextName() { return `${pick(FIRST)} ${pick(LAST)}`; }

const persons: Person[] = [];

function add(title: string, squads: string[], salary: number, parentId: string | null): string {
  const pid = id();
  persons.push({ id: pid, fullName: nextName(), title, squads, salary: randSalary(salary), parentId, avatarUrl: avatar(pid) });
  return pid;
}

// ── Level 0: CEO ───────────────────────────────────────────────────────────
const ceo = add('CEO', [], 400000, null);

// ── Level 1: C-suite ───────────────────────────────────────────────────────
const cto = add('CTO', [], 320000, ceo);
const cpo = add('Chief Product Officer', [], 300000, ceo);
const cdo = add('Chief Design Officer', [], 290000, ceo);
const headBA = add('Head of Business Analysis', [], 260000, ceo);
const headDM = add('Head of Delivery', [], 265000, ceo);

// ── Level 2: Senior EMs + Senior QA Manager ────────────────────────────────
const senEM = add('Senior Engineering Manager', [], 240000, cto);
const senQA = add('Senior QA Manager', [], 230000, cto);

// ── Squad groupings ────────────────────────────────────────────────────────
const squadGroups: string[][] = [
  ['Search', 'PLP'],
  ['Order Management', 'L2'],
  ['Navigation', 'Learn'],
  ['Cross-sell', 'PDP'],
  ['Basket', 'Checkout'],
];

// ── Level 3: EMs, QA Managers, POs, BAs, SMs, Designers ───────────────────
const emIds: Record<string, string> = {};
const qaIds: Record<string, string> = {};

for (const group of squadGroups) {
  const eid = add('Engineering Manager', group, 190000, senEM);
  for (const s of group) emIds[s] = eid;

  const qid = add('QA Manager', group, 185000, senQA);
  for (const s of group) qaIds[s] = qid;
}

// 5 POs
const poDefs: string[][] = [['PLP','Search'],['PDP','Navigation'],['Order Management','Learn'],['Checkout','Cross-sell'],['Basket','L2']];
for (const sq of poDefs) add('Product Owner', sq, 160000, cpo);

// 5 BAs
const baDefs: string[][] = [['PLP','Checkout'],['PDP','Basket'],['Order Management','Cross-sell'],['Search','L2'],['Navigation','Learn']];
for (const sq of baDefs) add('Business Analyst', sq, 130000, headBA);

// 4 SMs
const smDefs: string[][] = [['PLP','PDP','Search'],['Order Management','Checkout'],['Basket','Navigation','Learn'],['Cross-sell','L2']];
for (const sq of smDefs) add('Scrum Master', sq, 125000, headDM);

// 4 Designers
const desDefs: string[][] = [['PLP','PDP','Checkout','Basket'],['Order Management','Search','Navigation'],['Learn','Cross-sell','L2'],['PLP']];
for (const sq of desDefs) add('Designer', sq, 140000, cdo);

// ── Level 4-5: Per-squad Lead Dev, Lead QA, Devs, QAs ─────────────────────
const devCounts: Record<string, number> = {
  'PLP': 14, 'PDP': 12, 'Order Management': 14, 'Checkout': 15, 'Basket': 12,
  'Search': 14, 'Navigation': 12, 'Learn': 14, 'Cross-sell': 15, 'L2': 12,
};
const qaCounts: Record<string, number> = {
  'PLP': 6, 'PDP': 5, 'Order Management': 6, 'Checkout': 5, 'Basket': 6,
  'Search': 5, 'Navigation': 5, 'Learn': 6, 'Cross-sell': 6, 'L2': 5,
};

for (const s of ALL_SQUADS) {
  const em = emIds[s];
  const qa = qaIds[s];

  // Lead Dev + Devs → EM
  add('Lead Developer', [s], 175000, em);
  const dc = devCounts[s];
  for (let i = 0; i < dc; i++) {
    const title = i < 2 ? 'Senior Developer' : i < dc - 1 ? 'Developer' : 'Junior Developer';
    const sal = i < 2 ? 155000 : i < dc - 1 ? 135000 : 110000;
    add(title, [s], sal, em);
  }

  // Lead QA + QAs → QA Manager
  add('Lead QA Engineer', [s], 160000, qa);
  const qc = qaCounts[s];
  for (let i = 0; i < qc; i++) {
    const title = i === 0 ? 'Senior QA Engineer' : 'QA Engineer';
    const sal = i === 0 ? 140000 : 120000;
    add(title, [s], sal, qa);
  }
}

// ── Unallocated ────────────────────────────────────────────────────────────
for (let i = 0; i < 8; i++) {
  add(pick(['Developer', 'Designer', 'QA Engineer', 'Business Analyst', 'Senior Developer', 'Scrum Master']), [], randSalary(120000), null);
}

// Extra ICs spread across squads to reach ~300
for (const s of ALL_SQUADS) {
  for (let i = 0; i < 4; i++) {
    const titles = ['Developer', 'Senior Developer', 'QA Engineer', 'Designer'];
    const sals = [135000, 155000, 120000, 140000];
    add(titles[i], [s], randSalary(sals[i]), emIds[s]);
  }
}

export const seedPersons: Person[] = persons;
