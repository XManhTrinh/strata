/**
 * Turning a parsed file into import rows: which column feeds which field, guessed from the
 * headers and adjusted by the importer, then each record built in the shape import_rows expects.
 */

export const IMPORT_FIELDS = [
  "person_key",
  "email",
  "full_name",
  "start_date",
  "end_date",
  "country",
  "manager_key",
  "position",
  "career_level",
  "employment_type",
  "annual_salary",
  "day_rate",
  "currency",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];
export type DateFormat = "iso" | "dmy" | "mdy";

export type ImportMapping = {
  keyField: "person_key" | "email";
  /** Field → column header. */
  columns: Partial<Record<ImportField, string>>;
  /** Hierarchy columns, top level first: each column holds unit names at one level. */
  units: { column: string; levelId: string }[];
  /** Custom field key → column header. */
  custom: Record<string, string>;
  dateFormat: DateFormat;
};

/** Header words that suggest each field (compared without case, spaces or punctuation). */
const HINTS: Record<ImportField, string[]> = {
  person_key: ["personkey", "employeeid", "employeenumber", "staffid", "id", "personid", "empid"],
  email: ["email", "emailaddress", "workemail", "mail"],
  full_name: ["name", "fullname", "employeename", "displayname"],
  start_date: ["startdate", "hiredate", "joindate", "datejoined", "start"],
  end_date: ["enddate", "leavedate", "terminationdate", "leavingdate", "end"],
  country: ["country", "countrycode"],
  manager_key: [
    "managerid",
    "managerkey",
    "linemanagerid",
    "manageremployeeid",
    "manager",
    "linemanager",
    "manageremail",
  ],
  position: ["position", "jobtitle", "title", "role"],
  career_level: ["grade", "level", "careerlevel", "band"],
  employment_type: ["employmenttype", "contracttype", "workertype", "type"],
  annual_salary: ["salary", "annualsalary", "basesalary"],
  day_rate: ["dayrate", "dailyrate"],
  currency: ["currency"],
};

const squash = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

/** A first mapping from the headers: each field takes the best unused matching column. */
export function guessMapping(
  headers: string[],
  customFields: { key: string; label: string }[]
): ImportMapping {
  const used = new Set<string>();
  const take = (hints: string[]) => {
    for (const hint of hints) {
      const found = headers.find((h) => !used.has(h) && squash(h) === hint);
      if (found) {
        used.add(found);
        return found;
      }
    }
    return undefined;
  };
  const columns: ImportMapping["columns"] = {};
  for (const field of IMPORT_FIELDS) {
    const column = take(HINTS[field]);
    if (column) columns[field] = column;
  }
  const custom: Record<string, string> = {};
  for (const field of customFields) {
    const column = take([squash(field.key), squash(field.label)]);
    if (column) custom[field.key] = column;
  }
  return {
    keyField: columns.person_key ? "person_key" : "email",
    columns,
    units: [],
    custom,
    dateFormat: "iso",
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A date cell as YYYY-MM-DD, or undefined when it can't be read. */
export function parseDate(value: unknown, format: DateFormat): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  const parts = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text);
  let y: number, m: number, d: number;
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (parts && format !== "iso") {
    const [a, b] = [Number(parts[1]), Number(parts[2])];
    [y, m, d] = format === "dmy" ? [Number(parts[3]), b, a] : [Number(parts[3]), a, b];
  } else return undefined;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    ? `${y}-${pad(m)}-${pad(d)}`
    : undefined;
}

/** A number cell, accepting "52,000.50" and "52 000,50"; undefined when it isn't one. */
export function parseAmount(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  let text = String(value ?? "").replace(/[\s ']/g, "");
  if (!/\d/.test(text)) return undefined;
  // A comma after the last dot is a decimal comma, except a lone ",000" group (thousands).
  const decimalComma =
    text.lastIndexOf(",") > text.lastIndexOf(".") && !/^[^,.]*,\d{3}$/.test(text);
  text = decimalComma ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  const number = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : undefined;
}

const DATE_FIELDS = new Set<ImportField>(["start_date", "end_date"]);
const AMOUNT_FIELDS = new Set<ImportField>(["annual_salary", "day_rate"]);

/**
 * One file record as an import row. Empty cells are left out (so they don't clear values), and
 * values that can't be read are kept as text so the preview reports them.
 */
export function toImportRow(
  record: Record<string, unknown>,
  mapping: ImportMapping
): Record<string, unknown> {
  const cell = (column: string | undefined) => {
    if (!column) return undefined;
    const value = record[column];
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  };
  const row: Record<string, unknown> = {};
  for (const field of IMPORT_FIELDS) {
    const value = cell(mapping.columns[field]);
    if (value === undefined) continue;
    if (DATE_FIELDS.has(field)) row[field] = parseDate(value, mapping.dateFormat) ?? String(value);
    else if (AMOUNT_FIELDS.has(field)) row[field] = parseAmount(value) ?? String(value);
    else row[field] = String(value instanceof Date ? parseDate(value, "iso") : value).trim();
  }
  const path = mapping.units.map((u) => cell(u.column)).filter((v) => v !== undefined);
  if (path.length) row.unit_path = path.map((v) => String(v).trim());
  const custom = Object.fromEntries(
    Object.entries(mapping.custom).flatMap(([key, column]) => {
      const value = cell(column);
      return value === undefined
        ? []
        : [[key, value instanceof Date ? parseDate(value, "iso") : value]];
    })
  );
  if (Object.keys(custom).length) row.custom = custom;
  return row;
}
