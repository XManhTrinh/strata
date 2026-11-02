import { describe, expect, it } from "vitest";
import {
  DEFAULT_DIRECTORY_PARAMS,
  directorySearch,
  parseDirectoryParams,
  parseDirectoryView,
} from "./directory-params";

const UNIT = "0b0f8f3e-2c4b-4a7e-9d61-3f1c2a9b8e70";

describe("directory params", () => {
  it("falls back to the defaults for missing or malformed values", () => {
    expect(parseDirectoryParams({})).toEqual(DEFAULT_DIRECTORY_PARAMS);
    expect(
      parseDirectoryParams({ unit: "x", status: "gone", sort: "salary", page: "-3", size: "7" })
    ).toEqual(DEFAULT_DIRECTORY_PARAMS);
  });

  it("round-trips through the URL, writing only what differs", () => {
    const params = {
      ...DEFAULT_DIRECTORY_PARAMS,
      search: "ana",
      unitId: UNIT,
      status: "leavers" as const,
      sorts: [
        { key: "start_date" as const, descending: true },
        { key: "name" as const, descending: false },
      ],
      page: 2,
      size: 100,
    };
    const search = directorySearch(params);
    expect(search).toBe(
      `?q=ana&unit=${UNIT}&status=leavers&sort=-start_date%2Cname&page=3&size=100`
    );
    expect(parseDirectoryParams(Object.fromEntries(new URLSearchParams(search)))).toEqual(params);
    expect(directorySearch(DEFAULT_DIRECTORY_PARAMS)).toBe("");
  });

  it("reads column filters, keeping only known columns and valid values", () => {
    const f = JSON.stringify({
      name: { contains: " ana " },
      unit: { in: [UNIT, "not-an-id"] },
      start_date: { from: "2024-01-01", to: "soon" },
      salary: { contains: "1" },
      email: { contains: "" },
    });
    expect(parseDirectoryParams({ f }).columnFilters).toEqual({
      name: { contains: "ana" },
      unit: { in: [UNIT] },
      start_date: { from: "2024-01-01" },
    });
    expect(parseDirectoryParams({ f: "{not json" }).columnFilters).toEqual({});
    const params = { ...DEFAULT_DIRECTORY_PARAMS, columnFilters: { email: { contains: "x" } } };
    expect(
      parseDirectoryParams(Object.fromEntries(new URLSearchParams(directorySearch(params))))
    ).toEqual(params);
  });

  it("reads links from before sorting by several columns", () => {
    expect(parseDirectoryParams({ sort: "unit", desc: "1" }).sorts).toEqual([
      { key: "unit", descending: true },
    ]);
    expect(parseDirectoryParams({ sort: "unit,-salary,unit,email,level,type" }).sorts).toEqual([
      { key: "unit", descending: false },
      { key: "email", descending: false },
      { key: "level", descending: false },
    ]);
  });
});

const { page: _page, ...withoutPage } = DEFAULT_DIRECTORY_PARAMS;

describe("saved directory views", () => {
  it("keeps what's valid and drops the rest", () => {
    expect(
      parseDirectoryView({
        params: { search: "ana", status: "all", sort: "bogus", size: 25 },
        columns: { columnOrder: ["name", 3], hidden: ["email"], widths: { name: 300, unit: -1 } },
      })
    ).toEqual({
      params: {
        ...withoutPage,
        search: "ana",
        status: "all",
        size: 25,
      },
      columns: {
        columnOrder: ["name"],
        hidden: ["email"],
        widths: { name: 300 },
        pinned: { start: ["name"], end: [] },
      },
    });
    expect(parseDirectoryView(null).columns).toEqual({
      columnOrder: [],
      hidden: [],
      widths: {},
      pinned: { start: ["name"], end: [] },
    });
    // Saved before sorting by several columns: one sort and a direction.
    expect(parseDirectoryView({ params: { sort: "unit", descending: true } }).params.sorts).toEqual(
      [{ key: "unit", descending: true }]
    );
    expect(
      parseDirectoryView({ params: { sorts: [{ key: "type", descending: true }, { key: "x" }] } })
        .params.sorts
    ).toEqual([{ key: "type", descending: true }]);
  });
});
