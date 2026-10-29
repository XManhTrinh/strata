"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Select, SelectItem, Switch, TextField } from "@windmorph/react";
import { Tag } from "@windmorph/react-pro";
import { type ColumnDef, DataTable } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { useDataTableLabels } from "@/hooks/use-data-table-labels";
import { setEntryArchived } from "../entry-actions";
import { savePosition } from "../job-actions";
import type { CareerLevel, Position } from "../types";
import { useRunAction } from "../use-run-action";
import { FormDialog } from "./form-dialog";
import { ItemMenu } from "./item-menu";

/** Positions in a searchable table; a row opens the position to edit. */
export function PositionsSection({
  positions,
  levels,
}: {
  positions: Position[];
  levels: CareerLevel[];
}) {
  const t = useTranslations("jobs");
  const { workspace } = useWorkspace();
  const labels = useDataTableLabels();
  const [run] = useRunAction();
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Position | "new" | null>(null);
  const position = editing === "new" ? null : editing;
  const [range, setRange] = useState({ min: "none", max: "none" });

  const levelLabel = useMemo(() => {
    const byId = new Map(levels.map((l) => [l.id, l.track ? `${l.track} · ${l.name}` : l.name]));
    return (id: string | null) => (id ? (byId.get(id) ?? "") : "");
  }, [levels]);
  const rangeText = (p: Position) =>
    p.minLevelId || p.maxLevelId
      ? [levelLabel(p.minLevelId), levelLabel(p.maxLevelId)].filter(Boolean).join(" – ")
      : t("positions.anyLevel");

  function open(next: Position | "new") {
    setRange({
      min: (next !== "new" && next.minLevelId) || "none",
      max: (next !== "new" && next.maxLevelId) || "none",
    });
    setEditing(next);
  }

  function toggleArchived(p: Position) {
    run(
      () => setEntryArchived("positions", p.id, !p.archived),
      t(p.archived ? "restored" : "archivedDone", { name: p.name })
    );
  }

  const columns: ColumnDef<Position>[] = [
    {
      id: "name",
      header: t("name"),
      accessor: (p) => p.name,
      cell: (p) => (
        <span className="flex items-center gap-2">
          {p.name}
          {p.archived && <Tag color="neutral">{t("archived")}</Tag>}
        </span>
      ),
      isRowHeader: true,
      hideable: false,
      width: 220,
    },
    { id: "levels", header: t("positions.levels"), accessor: rangeText, width: 220 },
    {
      id: "description",
      header: t("positions.description"),
      accessor: (p) => p.description,
      width: 200,
    },
    {
      id: "actions",
      header: "",
      accessor: () => null,
      sortable: false,
      hideable: false,
      width: 72,
      minWidth: 72,
      align: "end",
      cell: (p) => (
        <ItemMenu
          label={t("actions", { name: p.name })}
          onAction={(key) => (key === "edit" ? open(p) : toggleArchived(p))}
          actions={[
            { key: "edit", label: t("edit"), icon: "edit" },
            p.archived
              ? { key: "restore", label: t("restore"), icon: "unarchive" }
              : { key: "archive", label: t("archive"), icon: "archive" },
          ]}
        />
      ),
    },
  ];

  // The highest level stays on the lowest one's track, at or above it.
  const min = levels.find((l) => l.id === range.min);
  const highest = levels.filter((l) => !min || (l.track === min.track && l.rank >= min.rank));
  const choosable = (list: CareerLevel[], current: string) =>
    list.filter((l) => !l.archived || l.id === current);

  return (
    <section aria-labelledby="positions-title" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h3 id="positions-title" className="text-title-large text-on-surface">
          {t("positions.title")}
        </h3>
        <Button variant="tonal" leadingIcon={<Icon name="add" />} onPress={() => open("new")}>
          {t("positions.add")}
        </Button>
      </header>
      <p className="text-body-medium text-on-surface-variant">{t("positions.intro")}</p>
      <DataTable
        aria-label={t("positions.title")}
        columns={columns}
        rows={positions.filter((p) => showArchived || !p.archived)}
        getRowId={(p) => p.id}
        onRowAction={open}
        filters={
          <Switch checked={showArchived} onCheckedChange={setShowArchived}>
            {t("showArchived")}
          </Switch>
        }
        empty={
          <p className="text-body-medium text-on-surface-variant p-4">{t("positions.empty")}</p>
        }
        compactItem={(p) => ({ headline: p.name, supporting: rangeText(p) })}
        labels={labels}
      />
      {editing && (
        <FormDialog
          title={t(position ? "positions.dialogEdit" : "positions.dialogAdd")}
          submitLabel={t(position ? "save" : "add")}
          action={savePosition.bind(null, workspace.id, position?.id ?? null)}
          done={(name) => t(position ? "saved" : "added", { name })}
          onClose={() => setEditing(null)}
        >
          {(fieldError) => (
            <>
              <TextField
                className="w-full"
                name="name"
                label={t("name")}
                required
                defaultValue={position?.name ?? ""}
                invalid={Boolean(fieldError("name"))}
                errorMessage={fieldError("name")}
              />
              <TextField
                className="w-full"
                name="description"
                label={t("positions.description")}
                multiline
                rows={2}
                defaultValue={position?.description ?? ""}
              />
              {(["min", "max"] as const).map((end) => (
                <Select
                  key={end}
                  className="w-full"
                  name={end === "min" ? "minLevelId" : "maxLevelId"}
                  label={t(end === "min" ? "positions.minLevel" : "positions.maxLevel")}
                  value={range[end]}
                  onChange={(key) => key != null && setRange({ ...range, [end]: String(key) })}
                  invalid={Boolean(fieldError(end === "min" ? "minLevelId" : "maxLevelId"))}
                  errorMessage={fieldError(end === "min" ? "minLevelId" : "maxLevelId")}
                >
                  {[
                    <SelectItem key="none">{t("positions.anyLevel")}</SelectItem>,
                    ...choosable(end === "min" ? levels : highest, range[end]).map((l) => (
                      <SelectItem key={l.id}>{levelLabel(l.id)}</SelectItem>
                    )),
                  ]}
                </Select>
              ))}
            </>
          )}
        </FormDialog>
      )}
    </section>
  );
}
