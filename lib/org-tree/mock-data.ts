import { Person } from './types';

let _id = 0;
function id() { return `p${++_id}`; }
function avatar(pid: string) { return `https://i.pravatar.cc/150?u=${pid}`; }

const ALL_SQUADS = ['PLP', 'PDP', 'Order Management', 'Checkout', 'Basket', 'Search', 'Navigation', 'Learn', 'Cross-sell', 'L2'];

// ── Leadership ─────────────────────────────────────────────────────────────
const ceo    = id();
const cto    = id();
const cpo    = id();
const vpDes  = id();
const headBA = id();
const headDM = id();
const senEM  = id();
const senQA  = id();

const leadership: Person[] = [
  { id: ceo,    fullName: 'Sarah Chen',       title: 'CEO',                       squads: [],  salary: 380000, parentId: null,  avatarUrl: avatar(ceo) },
  { id: cto,    fullName: 'Marcus Williams',   title: 'CTO',                       squads: [],  salary: 310000, parentId: ceo,   avatarUrl: avatar(cto) },
  { id: cpo,    fullName: 'Priya Patel',       title: 'Chief Product Officer',     squads: [],  salary: 300000, parentId: ceo,   avatarUrl: avatar(cpo) },
  { id: vpDes,  fullName: 'James Okafor',      title: 'VP of Design',              squads: [],  salary: 260000, parentId: ceo,   avatarUrl: avatar(vpDes) },
  { id: headBA, fullName: 'Lena Hoffmann',     title: 'Head of Business Analysis', squads: [],  salary: 240000, parentId: ceo,   avatarUrl: avatar(headBA) },
  { id: headDM, fullName: 'Sofia Andersen',    title: 'Head of Delivery',          squads: [],  salary: 245000, parentId: ceo,   avatarUrl: avatar(headDM) },
  { id: senEM,  fullName: 'Carlos Mendez',     title: 'Senior Engineering Manager',squads: [],  salary: 230000, parentId: cto,   avatarUrl: avatar(senEM) },
  { id: senQA,  fullName: 'Aisha Nwosu',       title: 'Senior QA Manager',         squads: [],  salary: 225000, parentId: cto,   avatarUrl: avatar(senQA) },
];

// ── Squad groupings (shared by EMs and QA Managers) ────────────────────────
const squadGroups: string[][] = [
  ['Search', 'PLP'],
  ['Order Management', 'L2'],
  ['Navigation', 'Learn'],
  ['Cross-sell', 'PDP'],
  ['Basket', 'Checkout'],
];

// ── Name pool ──────────────────────────────────────────────────────────────
const names = [
  'Oliver Smith','Emma Johnson','Liam Brown','Sophia Taylor','Noah Anderson',
  'Ava Thomas','Ethan Jackson','Mia White','Lucas Harris','Isabella Martin',
  'Mason Thompson','Charlotte Garcia','Logan Martinez','Amelia Robinson','Alexander Clark',
  'Harper Rodriguez','Daniel Lewis','Evelyn Lee','Henry Walker','Abigail Hall',
  'Sebastian Allen','Emily Young','Jack Hernandez','Ella King','Owen Wright',
  'Scarlett Lopez','Samuel Hill','Grace Scott','Ryan Green','Lily Adams',
  'Nathan Baker','Chloe Gonzalez','Leo Nelson','Zoey Carter','Adrian Mitchell',
  'Nora Perez','Caleb Roberts','Riley Turner','Isaac Phillips','Layla Campbell',
  'Dylan Parker','Penelope Evans','Luke Edwards','Aria Collins','Gabriel Stewart',
  'Ellie Sanchez','Julian Morris','Hannah Rogers','Mateo Reed','Stella Cook',
  'Anthony Morgan','Aurora Bell','Jaxon Murphy','Savannah Bailey','Lincoln Rivera',
  'Brooklyn Cooper','Joshua Richardson','Leah Cox','Christopher Howard','Zoe Ward',
  'Andrew Torres','Audrey Peterson','Theodore Gray','Claire Ramirez','Kai James',
  'Skylar Watson','Ezra Brooks','Violet Kelly','Thomas Sanders','Lucy Price',
  'Finn Bennett','Anna Wood','Axel Barnes','Samantha Ross','Ryder Henderson',
  'Caroline Coleman','Miles Jenkins','Genesis Perry','Declan Powell','Aaliyah Long',
  'Elijah Patterson','Naomi Hughes','Grayson Flores','Elena Washington','Levi Butler',
  'Maya Simmons','Cameron Foster','Willow Gonzales','Rowan Bryant','Paisley Alexander',
  'Asher Russell','Madelyn Griffin','Dominic Diaz','Piper Hayes','Hunter Myers',
  'Ruby Ford','Colton Hamilton','Eva Graham','Ian Sullivan','Serenity Wallace',
  'Jasper West','Autumn Cole','Nolan Gibson','Adeline Murray','Connor Freeman',
  'Hailey Wells','Everett Webb','Gianna Simpson','Parker Stevens','Valentina Tucker',
  'Sawyer Porter','Kennedy Hunter','Bentley Hicks','Kinsley Crawford','Damian Henry',
  'Allison Vasquez','Xavier Burns','Natalie Gordon','Silas Shaw','Peyton Watkins',
  'Bennett Dixon','Brianna Romero','Brooks Reyes','Sadie Garrett','Jace Morales',
  'Quinn Holland','Weston Floyd','Ivy Hale','Micah Cross','Emery Dunn',
];
let nameIdx = 0;
function nextName() { return names[nameIdx++ % names.length]; }

const members: Person[] = [];

// ── 5 EMs — each covers their squad group, reports to Senior EM ────────────
const emIds: Record<string, string> = {};
for (const group of squadGroups) {
  const eid = id();
  members.push({ id: eid, fullName: nextName(), title: 'Engineering Manager', squads: group, salary: 190000, parentId: senEM, avatarUrl: avatar(eid) });
  for (const s of group) emIds[s] = eid;
}

// ── 5 QA Managers — same groupings, reports to Senior QA Manager ───────────
const qaIds: Record<string, string> = {};
for (const group of squadGroups) {
  const qid = id();
  members.push({ id: qid, fullName: nextName(), title: 'QA Manager', squads: group, salary: 185000, parentId: senQA, avatarUrl: avatar(qid) });
  for (const s of group) qaIds[s] = qid;
}

// ── 5 POs — each covers 2 squads, reports to CPO ──────────────────────────
const poDefs: string[][] = [
  ['PLP', 'Search'],
  ['PDP', 'Navigation'],
  ['Order Management', 'Learn'],
  ['Checkout', 'Cross-sell'],
  ['Basket', 'L2'],
];
for (const sq of poDefs) {
  const pid = id();
  members.push({ id: pid, fullName: nextName(), title: 'Product Owner', squads: sq, salary: 160000, parentId: cpo, avatarUrl: avatar(pid) });
}

// ── 5 BAs — each covers 2 squads, reports to Head of BA ───────────────────
const baDefs: string[][] = [
  ['PLP', 'Checkout'],
  ['PDP', 'Basket'],
  ['Order Management', 'Cross-sell'],
  ['Search', 'L2'],
  ['Navigation', 'Learn'],
];
for (const sq of baDefs) {
  const bid = id();
  members.push({ id: bid, fullName: nextName(), title: 'Business Analyst', squads: sq, salary: 130000, parentId: headBA, avatarUrl: avatar(bid) });
}

// ── 4 SMs — each covers 2-3 squads, reports to Head of Delivery ───────────
const smDefs: string[][] = [
  ['PLP', 'PDP', 'Search'],
  ['Order Management', 'Checkout'],
  ['Basket', 'Navigation', 'Learn'],
  ['Cross-sell', 'L2'],
];
for (const sq of smDefs) {
  const sid = id();
  members.push({ id: sid, fullName: nextName(), title: 'Scrum Master', squads: sq, salary: 125000, parentId: headDM, avatarUrl: avatar(sid) });
}

// ── 3 Designers — each covers 3-4 squads, reports to VP Design ─────────────
const desDefs: string[][] = [
  ['PLP', 'PDP', 'Checkout', 'Basket'],
  ['Order Management', 'Search', 'Navigation'],
  ['Learn', 'Cross-sell', 'L2'],
  ['PLP'],
];
for (const sq of desDefs) {
  const did = id();
  members.push({ id: did, fullName: nextName(), title: 'Designer', squads: sq, salary: 140000, parentId: vpDes, avatarUrl: avatar(did) });
}

// ── Per-squad dev & QA teams ───────────────────────────────────────────────
const devCounts: Record<string, number> = {
  'PLP': 6, 'PDP': 5, 'Order Management': 6, 'Checkout': 7, 'Basket': 5,
  'Search': 6, 'Navigation': 5, 'Learn': 6, 'Cross-sell': 7, 'L2': 5,
};
const qaCounts: Record<string, number> = {
  'PLP': 4, 'PDP': 3, 'Order Management': 4, 'Checkout': 3, 'Basket': 4,
  'Search': 3, 'Navigation': 3, 'Learn': 4, 'Cross-sell': 4, 'L2': 3,
};

for (const s of ALL_SQUADS) {
  const em = emIds[s];
  const qa = qaIds[s];

  // Lead Dev → EM
  const leadDevId = id();
  members.push({ id: leadDevId, fullName: nextName(), title: 'Lead Developer', squads: [s], salary: 175000, parentId: em, avatarUrl: avatar(leadDevId) });

  // Lead QA → QA Manager
  const leadQaId = id();
  members.push({ id: leadQaId, fullName: nextName(), title: 'Lead QA Engineer', squads: [s], salary: 160000, parentId: qa, avatarUrl: avatar(leadQaId) });

  // Devs → EM
  const dc = devCounts[s];
  for (let i = 0; i < dc; i++) {
    const did = id();
    const title = i < 2 ? 'Senior Developer' : i < dc - 1 ? 'Developer' : 'Junior Developer';
    const sal = i < 2 ? 155000 : i < dc - 1 ? 135000 : 110000;
    members.push({ id: did, fullName: nextName(), title, squads: [s], salary: sal, parentId: em, avatarUrl: avatar(did) });
  }

  // QAs → QA Manager
  const qc = qaCounts[s];
  for (let i = 0; i < qc; i++) {
    const qid = id();
    const title = i === 0 ? 'Senior QA Engineer' : 'QA Engineer';
    const sal = i === 0 ? 140000 : 120000;
    members.push({ id: qid, fullName: nextName(), title, squads: [s], salary: sal, parentId: qa, avatarUrl: avatar(qid) });
  }
}

// ── Unallocated ────────────────────────────────────────────────────────────
const u1 = id(), u2 = id(), u3 = id(), u4 = id();
const unallocated: Person[] = [
  { id: u1, fullName: nextName(), title: 'Frontend Engineer',  squads: [], salary: 140000, parentId: null, avatarUrl: avatar(u1) },
  { id: u2, fullName: nextName(), title: 'Data Engineer',      squads: [], salary: 138000, parentId: null, avatarUrl: avatar(u2) },
  { id: u3, fullName: nextName(), title: 'Product Designer',   squads: [], salary: 128000, parentId: null, avatarUrl: avatar(u3) },
  { id: u4, fullName: nextName(), title: 'Backend Engineer',   squads: [], salary: 143000, parentId: null, avatarUrl: avatar(u4) },
];

export const seedPersons: Person[] = [...leadership, ...members, ...unallocated];
