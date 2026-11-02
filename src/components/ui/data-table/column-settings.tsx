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
import { ItemMenu } from "@/components/ui/item-menu";
import { moveColumn, pinColumn } from "./table-state";
import type { ColumnDef, DataTableLabels, TableState } from "./types";
import { FORM_DIALOG_CLASSES } from "@/components/ui/form-dialog";

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
  onChange: (next: Pick<TableState, "columnOrder" | "hidden" | "pinned">) => void;
  onReset: () => void;
  onClose: () => void;
  labels: DataTableLabels;
}) {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const order = [
    ...state.columnOrder.filter((id) => byId.has(id)),
    ...columns.map((c) => c.id).filter((id) => !state.columnOrder.includes(id)),
  ];

  const pinnedSide = (id: string) =>
    state.pinned.start.includes(id) ? "start" : state.pinned.end.includes(id) ? "end" : null;

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
        pinned: state.pinned,
      });
    },
  });

  return (
    // Changes here re-render the table underneath; close only on Escape or Done.
    <Dialog
      role="dialog"
      closedBy="closerequest"
      open
      onOpenChange={(open) => !open && onClose()}
      classNames={FORM_DIALOG_CLASSES}
    >
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
              pinned: state.pinned,
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
              <span className="flex flex-1 items-center gap-2">
                {column.header}
                {pinnedSide(column.id) && (
                  <span
                    className="text-on-surface-variant flex"
                    aria-label={
                      pinnedSide(column.id) === "start" ? labels.pinnedStart : labels.pinnedEnd
                    }
                  >
                    <Icon name="keep" size={18} />
                  </span>
                )}
              </span>
              {column.pinnable !== false && (
                <ItemMenu
                  label={labels.pinMenu(column.header)}
                  actions={[
                    pinnedSide(column.id) !== "start" && {
                      key: "start",
                      label: labels.pinStart,
                      icon: "keep",
                    },
                    pinnedSide(column.id) !== "end" && {
                      key: "end",
                      label: labels.pinEnd,
                      icon: "keep",
                    },
                    pinnedSide(column.id) && { key: "none", label: labels.unpin, icon: "keep_off" },
                  ]}
                  onAction={(key) =>
                    onChange({
                      columnOrder: order,
                      hidden: state.hidden,
                      pinned: pinColumn(
                        state.pinned,
                        column.id,
                        key === "none" ? null : (key as "start" | "end")
                      ),
                    })
                  }
                />
              )}
              <IconButton
                variant="standard"
                aria-label={labels.moveUp(column.header)}
                icon={<Icon name="arrow_upward" />}
                onPress={() =>
                  onChange({
                    columnOrder: moveColumn(order, column.id, -1),
                    hidden: state.hidden,
                    pinned: state.pinned,
                  })
                }
              />
              <IconButton
                variant="standard"
                aria-label={labels.moveDown(column.header)}
                icon={<Icon name="arrow_downward" />}
                onPress={() =>
                  onChange({
                    columnOrder: moveColumn(order, column.id, 1),
                    hidden: state.hidden,
                    pinned: state.pinned,
                  })
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
