/** The directory's search, filters, sort and page, as kept in the URL. Shared by server and client. */

export const DIRECTORY_SORTS = ["name", "unit", "position", "start_date"] as const;
export const DIRECTORY_STATUSES = ["current", "leavers", "all"] as const;
const DIRECTORY_PAGE_SIZES = [25, 50, 100] as const;

export type DirectorySort = (typeof DIRECTORY_SORTS)[number];
type DirectoryStatus = (typeof DIRECTORY_STATUSES)[number];

export type DirectoryParams = {
  search: string;
  unitId: string | null;
  positionId: string | null;
  employmentTypeId: string | null;
  status: DirectoryStatus;
  sort: DirectorySort;
  descending: boolean;
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
  sort: "name",
  descending: false,
  page: 0,
  size: 50,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function oneOf<T extends string>(values: readonly T[], value: string | undefined, fallback: T): T {
  return values.includes(value as T) ? (value as T) : fallback;
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
    sort: oneOf(DIRECTORY_SORTS, get("sort"), "name"),
    descending: get("desc") === "1",
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
  if (params.sort !== d.sort) query.set("sort", params.sort);
  if (params.descending) query.set("desc", "1");
  if (params.page > 0) query.set("page", String(params.page + 1));
  if (params.size !== d.size) query.set("size", String(params.size));
  const text = query.toString();
  return text ? `?${text}` : "";
}
