"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import {
  Cell,
  Column,
  Row,
  type SortDescriptor,
  Table,
  TableBody,
  TableHeader,
  TableLayout,
  Virtualizer,
} from "react-aria-components";
import { type SpikePerson, generatePeople } from "./data";

const COLUMNS: { id: keyof SpikePerson; name: string; width: number }[] = [
  { id: "name", name: "Name", width: 220 },
  { id: "email", name: "Email", width: 300 },
  { id: "team", name: "Team", width: 140 },
  { id: "position", name: "Position", width: 180 },
  { id: "startDate", name: "Start date", width: 140 },
  { id: "salary", name: "Salary", width: 120 },
];

/** Spike: React Aria Table + Virtualizer over 100k rows, sorted in the browser. */
export function TableSpike({ count }: { count: number }) {
  const people = useMemo(() => {
    const rows = generatePeople(count);
    performance.mark("spike:data-ready");
    return rows;
  }, [count]);
  const [sort, setSort] = useState<SortDescriptor>({ column: "name", direction: "ascending" });

  const sorted = useMemo(() => {
    const key = sort.column as keyof SpikePerson;
    const direction = sort.direction === "ascending" ? 1 : -1;
    return [...people].sort((a, b) =>
      a[key] > b[key] ? direction : a[key] < b[key] ? -direction : 0
    );
  }, [people, sort]);

  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      performance.mark("spike:rows-painted");
      document.documentElement.dataset.spikeRendered = String(Date.now());
    });
  }, [sorted]);

  return (
    <Virtualizer layout={TableLayout} layoutOptions={{ rowHeight: 52, headingHeight: 56 }}>
      <Table
        aria-label="Spike people"
        selectionMode="multiple"
        sortDescriptor={sort}
        onSortChange={(next) => {
          performance.mark("spike:sort-start");
          setSort(next);
        }}
        className="bg-surface text-on-surface h-[70dvh] w-full overflow-auto"
        data-testid="spike-table"
      >
        <TableHeader className="bg-surface-container text-title-small sticky top-0">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              allowsSorting
              isRowHeader={column.id === "name"}
              width={column.width}
              className="px-4 text-start"
            >
              {column.name}
            </Column>
          ))}
        </TableHeader>
        <TableBody items={sorted}>
          {(person) => (
            <Row
              id={person.id}
              className="border-outline-variant text-body-medium border-b selected:bg-secondary-container"
            >
              {COLUMNS.map((column) => (
                <Cell key={column.id} className="truncate px-4">
                  {String(person[column.id])}
                </Cell>
              ))}
            </Row>
          )}
        </TableBody>
      </Table>
    </Virtualizer>
  );
}
