"use client";

import { useState } from "react";
import type { Key } from "react-aria-components";
import { useTranslations } from "next-intl";
import { IconButton, Menu, MenuItem, MenuTrigger, Switch } from "@windmorph/react";
import { Tag } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { TreeView } from "@/components/ui/tree-view";
import { setUnitArchived } from "../actions";
import { buildTree } from "../hierarchy";
import type { OrgLevel, OrgUnit, OrgUnitNode } from "../types";
import { useRunAction } from "../use-run-action";
import { UnitDialog } from "./unit-dialog";

type Editing = { unit: OrgUnit } | { parentId: string } | null;

/** The unit tree, root first, with add, edit (including moving) and archive on each unit. */
export function UnitsSection({ levels, units }: { levels: OrgLevel[]; units: OrgUnit[] }) {
  const t = useTranslations("hierarchy.units");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [run, pending] = useRunAction();
  const tree = buildTree(units, showArchived);
  const levelName = new Map(levels.map((l) => [l.id, l.name]));
  const root = tree[0];
  const [expanded, setExpanded] = useState<Set<Key>>(() => new Set(root ? [root.id] : []));

  function onAction(unit: OrgUnitNode, key: string) {
    if (key === "add") {
      setEditing({ parentId: unit.id });
      // Show the new sub-unit once it's added.
      setExpanded((keys) => new Set([...keys, unit.id]));
    }
    if (key === "edit") setEditing({ unit });
    if (key === "archive" || key === "restore") {
      run(
        () => setUnitArchived(unit.id, key === "archive"),
        t(key === "archive" ? "archivedDone" : "restored", { name: unit.name })
      );
    }
  }

  return (
    <section aria-labelledby="units-title" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h3 id="units-title" className="text-title-large text-on-surface">
          {t("title")}
        </h3>
        <Switch checked={showArchived} onCheckedChange={setShowArchived}>
          {t("showArchived")}
        </Switch>
      </header>
      {root && (
        <TreeView
          aria-label={t("title")}
          items={tree}
          textValue={(unit) => unit.name}
          expandedKeys={expanded}
          onExpandedChange={setExpanded}
          dependencies={[levels, showArchived, pending]}
        >
          {(unit) => (
            <>
              <span className={`flex-1 truncate ${unit.archived ? "text-on-surface-variant" : ""}`}>
                {unit.name}
                {unit.code && (
                  <span className="text-body-medium text-on-surface-variant ms-2">{unit.code}</span>
                )}
              </span>
              {unit.archived ? (
                <Tag color="neutral">{t("archived")}</Tag>
              ) : (
                unit.levelId && <Tag>{levelName.get(unit.levelId)}</Tag>
              )}
              <MenuTrigger>
                <IconButton
                  variant="standard"
                  aria-label={t("actions", { name: unit.name })}
                  icon={<Icon name="more_vert" />}
                />
                <Menu
                  aria-label={t("actions", { name: unit.name })}
                  onAction={(key) => onAction(unit, String(key))}
                >
                  {[
                    !unit.archived && (
                      <MenuItem key="add" leadingIcon={<Icon name="add" />}>
                        {t("addUnder")}
                      </MenuItem>
                    ),
                    unit.parentId && !unit.archived && (
                      <MenuItem key="edit" leadingIcon={<Icon name="edit" />}>
                        {t("edit")}
                      </MenuItem>
                    ),
                    unit.parentId && (
                      <MenuItem
                        key={unit.archived ? "restore" : "archive"}
                        leadingIcon={<Icon name={unit.archived ? "unarchive" : "archive"} />}
                      >
                        {t(unit.archived ? "restore" : "archive")}
                      </MenuItem>
                    ),
                  ].filter(Boolean)}
                </Menu>
              </MenuTrigger>
            </>
          )}
        </TreeView>
      )}
      {editing && (
        <UnitDialog
          unit={"unit" in editing ? editing.unit : undefined}
          parentId={"parentId" in editing ? editing.parentId : undefined}
          levels={levels}
          units={units}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
