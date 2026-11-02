import { describe, expect, it } from "vitest";
import {
  applyClientModel,
  initialTableState,
  moveColumn,
  nextSort,
  normalizeSort,
  pinColumn,
  pinPlaces,
  visibleColumns,
} from "./table-state";
import type { ColumnDef } from "./types";

type Person = { name: string; team: string; salary: number | null };
const columns: ColumnDef<Person>[] = [
  { id: "name", header: "Name", accessor: (p) => p.name, hideable: false },
  { id: "team", header: "Team", accessor: (p) => p.team },
  { id: "salary", header: "Salary", accessor: (p) => p.salary, type: "currency" },
];
const people: Person[] = [
  { name: "Ana", team: "Squad B", salary: 50000 },
  { name: "ben", team: "Squad A", salary: null },
  { name: "Carla", team: "Squad A", salary: 70000 },
];

describe("table state", () => {
  it("orders visible columns and keeps unhideable ones", () => {
    const state = initialTableState(columns, {
      columnOrder: ["salary", "name"],
      hidden: ["name", "team"],
    });
    expect(visibleColumns(columns, state).map((c) => c.id)).toEqual(["salary", "name"]);
  });

  it("moves a column one place, staying within bounds", () => {
    expect(moveColumn(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveColumn(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
  });
});

describe("client model", () => {
  it("searches across columns, case-insensitively", () => {
    const { pageRows } = applyClientModel(
      people,
      columns,
      initialTableState(columns, { search: "squad a" })
    );
    expect(pageRows.map((p) => p.name)).toEqual(["ben", "Carla"]);
  });

  it("sorts text with a locale-aware collator and numbers numerically, nulls last", () => {
    const byName = applyClientModel(
      people,
      columns,
      initialTableState(columns, { sort: [{ column: "name", direction: "ascending" }] })
    );
    expect(byName.pageRows.map((p) => p.name)).toEqual(["Ana", "ben", "Carla"]);
    const bySalary = applyClientModel(
      people,
      columns,
      initialTableState(columns, { sort: [{ column: "salary", direction: "descending" }] })
    );
    expect(bySalary.pageRows.map((p) => p.name)).toEqual(["Carla", "Ana", "ben"]);
  });

  it("pages after filtering and reports the total", () => {
    const result = applyClientModel(
      people,
      columns,
      initialTableState(columns, { page: { index: 1, size: 2 } })
    );
    expect(result).toEqual({ pageRows: [people[2]], total: 3 });
  });
});

describe("sorting by several columns", () => {
  const asc = (column: string) => ({ column, direction: "ascending" as const });
  const desc = (column: string) => ({ column, direction: "descending" as const });

  it("cycles one column ascending, descending, none; another column replaces it", () => {
    expect(nextSort([], "name", false)).toEqual([asc("name")]);
    expect(nextSort([asc("name")], "name", false)).toEqual([desc("name")]);
    expect(nextSort([desc("name")], "name", false)).toEqual([]);
    expect(nextSort([asc("name"), asc("unit")], "unit", false)).toEqual([asc("unit")]);
  });

  it("adds levels with Shift, cycles them in place, and stops at three", () => {
    expect(nextSort([asc("unit")], "name", true)).toEqual([asc("unit"), asc("name")]);
    expect(nextSort([asc("unit"), asc("name")], "name", true)).toEqual([asc("unit"), desc("name")]);
    expect(nextSort([asc("unit"), desc("name")], "name", true)).toEqual([asc("unit")]);
    expect(nextSort([asc("a"), asc("b"), asc("c")], "d", true)).toEqual([
      asc("a"),
      asc("b"),
      asc("c"),
    ]);
  });

  it("sorts rows by each level in turn", () => {
    const rows = [
      { name: "Bo", team: "B" },
      { name: "Al", team: "B" },
      { name: "Cy", team: "A" },
    ];
    const cols = [
      { id: "name", header: "Name", accessor: (r: (typeof rows)[number]) => r.name },
      { id: "team", header: "Team", accessor: (r: (typeof rows)[number]) => r.team },
    ];
    const result = applyClientModel(
      rows,
      cols,
      initialTableState(cols, { sort: [desc("team"), asc("name")] })
    );
    expect(result.pageRows.map((r) => r.name)).toEqual(["Al", "Bo", "Cy"]);
  });

  it("reads a sort saved before levels as one level", () => {
    expect(normalizeSort(asc("name"))).toEqual([asc("name")]);
    expect(normalizeSort(null)).toEqual([]);
    expect(normalizeSort([asc("a"), { column: 1 }, desc("b")])).toEqual([asc("a"), desc("b")]);
  });
});

describe("pinned columns", () => {
  const cols = ["a", "b", "c", "d"].map((id) => ({
    id,
    header: id,
    accessor: () => null,
    width: 100,
  }));

  it("moves pinned columns to their edge and works out where each sticks", () => {
    const state = initialTableState(cols, { pinned: { start: ["c"], end: ["a"] } });
    const shown = visibleColumns(cols, state);
    expect(shown.map((c) => c.id)).toEqual(["c", "b", "d", "a"]);
    const places = pinPlaces(shown, { ...state, pinned: { start: ["c", "b"], end: ["a"] } }, 56);
    expect(places.get("c")).toEqual({ side: "start", offset: 56, edge: false });
    expect(places.get("b")).toEqual({ side: "start", offset: 156, edge: true });
    expect(places.get("a")).toEqual({ side: "end", offset: 0, edge: true });
    expect(places.has("d")).toBe(false);
  });

  it("pins to one edge at a time", () => {
    const pinned = pinColumn({ start: ["a"], end: [] }, "a", "end");
    expect(pinned).toEqual({ start: [], end: ["a"] });
    expect(pinColumn(pinned, "a", null)).toEqual({ start: [], end: [] });
  });
});
