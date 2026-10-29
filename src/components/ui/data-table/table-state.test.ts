import { describe, expect, it } from "vitest";
import { applyClientModel, initialTableState, moveColumn, visibleColumns } from "./table-state";
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
      initialTableState(columns, { sort: { column: "name", direction: "ascending" } })
    );
    expect(byName.pageRows.map((p) => p.name)).toEqual(["Ana", "ben", "Carla"]);
    const bySalary = applyClientModel(
      people,
      columns,
      initialTableState(columns, { sort: { column: "salary", direction: "descending" } })
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
