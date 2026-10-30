"use client";

import {
  Button as AriaButton,
  GridList,
  GridListItem,
  useDragAndDrop,
} from "react-aria-components";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { SelectionCheckbox } from "./selection-checkbox";
import { moveColumn } from "./table-state";
import type { ColumnDef, DataTableLabels, TableState } from "./types";

/**
 * Show, hide and reorder columns. The list's selection is "shown columns" (Space toggles), rows
 * reorder by dragging the handle or with the move buttons.
 */
export function ColumnSettings<Row>({
  columns,
  state,
  onChange,
  onReset,
  onClose,
  labels,
}: {
  columns: ColumnDef<Row>[];
  state: TableState;
  onChange: (next: Pick<TableState, "columnOrder" | "hidden">) => void;
  onReset: () => void;
  onClose: () => void;
  labels: DataTableLabels;
}) {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const order = [
    ...state.columnOrder.filter((id) => byId.has(id)),
    ...columns.map((c) => c.id).filter((id) => !state.columnOrder.includes(id)),
  ];

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ "text/plain": String(key) })),
    onReorder: (event) => {
      const moving = [...event.keys].map(String);
      const rest = order.filter((id) => !moving.includes(id));
      const at =
        rest.indexOf(String(event.target.key)) + (event.target.dropPosition === "after" ? 1 : 0);
      onChange({
        columnOrder: [...rest.slice(0, at), ...moving, ...rest.slice(at)],
        hidden: state.hidden,
      });
    },
  });

  return (
    // Changes here re-render the table underneath; close only on Escape or Done.
    <Dialog role="dialog" closedBy="closerequest" open onOpenChange={(open) => !open && onClose()}>
      <DialogTitle>{labels.columnSettingsTitle}</DialogTitle>
      <DialogContent>
        <GridList
          aria-label={labels.columnSettingsTitle}
          items={order.map((id) => byId.get(id)!)}
          // Items are cached; re-render them so the move buttons see the current state.
          dependencies={[state]}
          dragAndDropHooks={dragAndDropHooks}
          selectionMode="multiple"
          selectionBehavior="toggle"
          selectedKeys={order.filter((id) => !state.hidden.includes(id))}
          onSelectionChange={(keys) => {
            const shown = keys === "all" ? order : [...keys].map(String);
            onChange({
              columnOrder: order,
              // Columns that can't be hidden stay shown.
              hidden: order.filter((id) => !shown.includes(id) && byId.get(id)?.hideable !== false),
            });
          }}
          className="flex flex-col"
        >
          {(column) => (
            <GridListItem
              id={column.id}
              textValue={column.header || column.id}
              className="text-body-large data-[dragging]:opacity-50 data-[drop-target]:bg-secondary-container flex items-center gap-2 rounded-lg py-1 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-secondary"
            >
              <AriaButton
                slot="drag"
                className="text-on-surface-variant flex size-10 cursor-grab items-center justify-center rounded-full"
              >
                <Icon name="drag_indicator" />
              </AriaButton>
              <SelectionCheckbox />
              <span className="flex-1">{column.header}</span>
              <IconButton
                variant="standard"
                aria-label={labels.moveUp(column.header)}
                icon={<Icon name="arrow_upward" />}
                onPress={() =>
                  onChange({ columnOrder: moveColumn(order, column.id, -1), hidden: state.hidden })
                }
              />
              <IconButton
                variant="standard"
                aria-label={labels.moveDown(column.header)}
                icon={<Icon name="arrow_downward" />}
                onPress={() =>
                  onChange({ columnOrder: moveColumn(order, column.id, 1), hidden: state.hidden })
                }
              />
            </GridListItem>
          )}
        </GridList>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onPress={onReset}>
          {labels.reset}
        </Button>
        <Button variant="text" onPress={onClose}>
          {labels.done}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
