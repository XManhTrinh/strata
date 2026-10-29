"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const ROW_HEIGHT = 40;
const CELL_WIDTH = 88;
const NAME_WIDTH = 220;

/** Spike: a 2D-virtualized editable grid (rows × months) with TanStack Virtual. */
export function GridSpike({ rows, months }: { rows: number; months: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Values live outside React state, so typing re-renders only the cell being edited.
  const values = useRef(new Float32Array(rows * months).fill(1));

  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: months,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CELL_WIDTH,
    overscan: 3,
  });

  return (
    <div
      ref={scrollRef}
      role="grid"
      aria-label="Spike allocations"
      aria-rowcount={rows}
      aria-colcount={months + 1}
      data-testid="spike-grid"
      className="bg-surface text-on-surface h-[70dvh] w-full overflow-auto"
    >
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: NAME_WIDTH + columnVirtualizer.getTotalSize(),
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            role="row"
            aria-rowindex={row.index + 1}
            className="border-outline-variant absolute left-0 flex border-b"
            style={{ top: row.start, height: ROW_HEIGHT, width: "100%" }}
          >
            <div
              role="rowheader"
              className="bg-surface text-body-medium sticky left-0 z-10 flex items-center px-3"
              style={{ width: NAME_WIDTH }}
            >
              {`Person ${row.index + 1}`}
            </div>
            {columnVirtualizer.getVirtualItems().map((column) => (
              <div
                key={column.key}
                role="gridcell"
                aria-colindex={column.index + 2}
                className="absolute"
                style={{ left: NAME_WIDTH + column.start, width: CELL_WIDTH, height: ROW_HEIGHT }}
              >
                <input
                  aria-label={`Person ${row.index + 1}, month ${column.index + 1}`}
                  className="text-body-medium h-full w-full bg-transparent px-2 text-end"
                  defaultValue={values.current[row.index * months + column.index]?.toFixed(2)}
                  onChange={(event) => {
                    values.current[row.index * months + column.index] =
                      Number(event.target.value) || 0;
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
