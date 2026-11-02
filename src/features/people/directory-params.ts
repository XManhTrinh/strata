/** The directory's search, filters, sort and page, as kept in the URL. Shared by server and client. */

/** Columns the directory sorts by (the database checks the same list). */
export const DIRECTORY_SORTS = [
  "name",
  "unit",
  "position",
  "level",
  "type",
  "manager",
  "email",
  "start_date",
] as const;
export const DIRECTORY_STATUSES = ["current", "leavers", "all"] as const;
const DIRECTORY_PAGE_SIZES = [25, 50, 100] as const;

export type DirectorySort = (typeof DIRECTORY_SORTS)[number];
export type DirectorySortLevel = { key: DirectorySort; descending: boolean };
type DirectoryStatus = (typeof DIRECTORY_STATUSES)[number];

export type DirectoryParams = {
  search: string;
  unitId: string | null;
  positionId: string | null;
  employmentTypeId: string | null;
  status: DirectoryStatus;
  /** Up to three levels, in order. */
  sorts: DirectorySortLevel[];
  /** Zero-based. */
  page: number;
  size: number;
};

export const DEFAULT_DIRECTORY_PARAMS: DirectoryParams = {
  search: "",
  unitId: null,
  positionId: null,
  employmentTypeId: null,
  status: "current",
  sorts: [{ key: "name", descending: false }],
  page: 0,
  size: 50,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function oneOf<T extends string>(values: readonly T[], value: string | undefined, fallback: T): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

/**
 * Sorts in the URL: column keys in order, "-" first for descending ("unit,-start_date"). Older
 * links have one key and `desc=1`. Unknown keys are dropped; none left means by name.
 */
function parseSorts(value: string | undefined, legacyDescending: boolean): DirectorySortLevel[] {
  const levels = (value ?? "")
    .split(",")
    .flatMap((part) => {
      const key = part.replace(/^-/, "");
      return (DIRECTORY_SORTS as readonly string[]).includes(key)
        ? [{ key: key as DirectorySort, descending: part.startsWith("-") }]
        : [];
    })
    .filter((level, i, all) => all.findIndex((l) => l.key === level.key) === i)
    .slice(0, 3);
  if (levels.length === 1 && legacyDescending) levels[0]!.descending = true;
  return levels.length > 0 ? levels : DEFAULT_DIRECTORY_PARAMS.sorts;
}

/** The URL and database form of the sorts: "unit,-start_date". */
export function sortText(sorts: DirectorySortLevel[]): string {
  return sorts.map((s) => `${s.descending ? "-" : ""}${s.key}`).join(",");
}

/** Reads the params, ignoring anything unknown or malformed. */
export function parseDirectoryParams(
  query: Record<string, string | string[] | undefined>
): DirectoryParams {
  const get = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const id = (key: string) => {
    const value = get(key);
    return value && UUID.test(value) ? value : null;
  };
  const page = Number.parseInt(get("page") ?? "", 10);
  const size = Number.parseInt(get("size") ?? "", 10);
  return {
    search: (get("q") ?? "").slice(0, 200),
    unitId: id("unit"),
    positionId: id("position"),
    employmentTypeId: id("type"),
    status: oneOf(DIRECTORY_STATUSES, get("status"), "current"),
    sorts: parseSorts(get("sort"), get("desc") === "1"),
    page: page > 1 ? page - 1 : 0,
    size: (DIRECTORY_PAGE_SIZES as readonly number[]).includes(size) ? size : 50,
  };
}

/** Writes only what differs from the defaults, so plain links stay short. */
export function directorySearch(params: DirectoryParams): string {
  const query = new URLSearchParams();
  const d = DEFAULT_DIRECTORY_PARAMS;
  if (params.search) query.set("q", params.search);
  if (params.unitId) query.set("unit", params.unitId);
  if (params.positionId) query.set("position", params.positionId);
  if (params.employmentTypeId) query.set("type", params.employmentTypeId);
  if (params.status !== d.status) query.set("status", params.status);
  const sort = sortText(params.sorts);
  if (sort !== sortText(d.sorts)) query.set("sort", sort);
  if (params.page > 0) query.set("page", String(params.page + 1));
  if (params.size !== d.size) query.set("size", String(params.size));
  const text = query.toString();
  return text ? `?${text}` : "";
}

/** A saved directory view: what's searched and filtered, and how the columns are laid out. */
export type DirectoryView = {
  params: Omit<DirectoryParams, "page">;
  columns: {
    columnOrder: string[];
    hidden: string[];
    widths: Record<string, number>;
    pinned: { start: string[]; end: string[] };
  };
};

/** The directory pins people's names, so they stay in view while wide tables scroll. */
export const DEFAULT_DIRECTORY_PINNED = { start: ["name"], end: [] as string[] };

/** Reads a saved view's state, keeping only what's valid (views outlive column changes). */
export function parseDirectoryView(state: unknown): DirectoryView {
  const value = (state ?? {}) as Partial<Record<string, unknown>>;
  const params = (value.params ?? {}) as Record<string, unknown>;
  const columns = (value.columns ?? {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v : undefined);
  const parsed = parseDirectoryParams({
    q: text(params.search),
    unit: text(params.unitId),
    position: text(params.positionId),
    type: text(params.employmentTypeId),
    status: text(params.status),
    // Views saved before sorting by several columns kept one sort and a direction.
    sort: Array.isArray(params.sorts)
      ? sortText(
          (params.sorts as { key?: unknown; descending?: unknown }[]).flatMap((l) =>
            typeof l?.key === "string"
              ? [{ key: l.key as DirectorySort, descending: l.descending === true }]
              : []
          )
        )
      : text(params.sort),
    desc: params.descending === true ? "1" : undefined,
    size: typeof params.size === "number" ? String(params.size) : undefined,
  });
  const strings = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const widths = Object.fromEntries(
    Object.entries((columns.widths ?? {}) as Record<string, unknown>).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0
    )
  );
  const { page: _page, ...rest } = parsed;
  return {
    params: rest,
    columns: {
      columnOrder: strings(columns.columnOrder),
      hidden: strings(columns.hidden),
      widths,
      // Views saved before pinning have none: they get the default.
      pinned:
        typeof columns.pinned === "object" && columns.pinned !== null
          ? {
              start: strings((columns.pinned as Record<string, unknown>).start),
              end: strings((columns.pinned as Record<string, unknown>).end),
            }
          : DEFAULT_DIRECTORY_PINNED,
    },
  };
}
