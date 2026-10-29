"use client";

import { useSyncExternalStore } from "react";
import { GridSpike } from "./grid-spike";
import { TableSpike } from "./table-spike";

const noopSubscribe = () => () => {};

/**
 * Rendered in the browser only: on the server a virtualizer has no viewport and would render
 * every row (finding from this spike; virtualized DataTable mode must do the same).
 */
export function SpikeView({ view, count }: { view: "table" | "grid"; count: number }) {
  const inBrowser = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  if (!inBrowser) return null;
  return (
    <main className="p-4">
      {view === "table" ? <TableSpike count={count} /> : <GridSpike rows={2_000} months={24} />}
    </main>
  );
}
