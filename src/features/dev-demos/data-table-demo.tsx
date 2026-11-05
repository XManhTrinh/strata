"use client";

import { useMemo } from "react";
import { Button } from "@windmorph/react";
import { type ColumnDef, DataTable } from "@/components/ui/data-table";
import { useDataTableLabels } from "@/hooks/use-data-table-labels";
import { type SpikePerson, generatePeople } from "./data";

const COLUMNS: ColumnDef<SpikePerson>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (p) => p.name,
    isRowHeader: true,
    hideable: false,
    width: 220,
  },
  { id: "email", header: "Email", accessor: (p) => p.email, width: 280 },
  { id: "team", header: "Team", accessor: (p) => p.team, width: 140 },
  { id: "position", header: "Position", accessor: (p) => p.position, width: 180 },
  { id: "salary", header: "Salary", accessor: (p) => p.salary, type: "currency", width: 120 },
];

/** Development-only demo of DataTable in client mode, used by the component's end-to-end test. */
export function DataTableDemo({ count }: { count: number }) {
  const people = useMemo(() => generatePeople(count), [count]);
  const labels = useDataTableLabels();
  return (
    <main className="p-4">
      <h1 className="text-headline-small mb-4">DataTable demo</h1>
      <DataTable
        aria-label="Demo people"
        columns={COLUMNS}
        rows={people}
        getRowId={(p) => p.id}
        selectable
        bulkActions={() => <Button variant="text">Export</Button>}
        compactItem={(p) => ({ headline: p.name, supporting: p.team })}
        labels={labels}
      />
    </main>
  );
}
