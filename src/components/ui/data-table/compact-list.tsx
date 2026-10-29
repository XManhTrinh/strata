"use client";

import type { ReactNode } from "react";
import { List, ListItem } from "@windmorph/react";

export type CompactItem = { headline: string; supporting?: string; leading?: ReactNode };

/** Below 600px the table becomes a Material 3 list, as tables don't fit phone screens. */
export function CompactList<Row>({
  ariaLabel,
  rows,
  getRowId,
  toItem,
  onRowAction,
}: {
  ariaLabel: string;
  rows: Row[];
  getRowId: (row: Row) => string;
  toItem: (row: Row) => CompactItem;
  onRowAction?: (row: Row) => void;
}) {
  const byId = new Map(rows.map((row) => [getRowId(row), row]));
  return (
    <List
      aria-label={ariaLabel}
      onAction={
        onRowAction
          ? (key) => byId.has(String(key)) && onRowAction(byId.get(String(key))!)
          : undefined
      }
    >
      {rows.map((row) => {
        const item = toItem(row);
        return (
          <ListItem
            key={getRowId(row)}
            textValue={item.headline}
            supportingText={item.supporting}
            leading={item.leading}
          >
            {item.headline}
          </ListItem>
        );
      })}
    </List>
  );
}
