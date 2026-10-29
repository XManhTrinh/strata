"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, IconButton, List, ListItem, Menu, MenuItem, MenuTrigger } from "@windmorph/react";
import { Tag } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { reorderLevels, setLevelArchived } from "../actions";
import type { OrgLevel, OrgUnit } from "../types";
import { useRunAction } from "../use-run-action";
import { LevelDialog } from "./level-dialog";

/** The workspace's levels from the top down, with add, rename, reorder and archive. */
export function LevelsSection({ levels, units }: { levels: OrgLevel[]; units: OrgUnit[] }) {
  const t = useTranslations("hierarchy.levels");
  const { workspace } = useWorkspace();
  const [editing, setEditing] = useState<OrgLevel | "new" | null>(null);
  const [run, pending] = useRunAction();

  function move(index: number, delta: -1 | 1) {
    const ids = levels.map((l) => l.id);
    [ids[index], ids[index + delta]] = [ids[index + delta]!, ids[index]!];
    run(() => reorderLevels(workspace.id, ids), t("reordered"));
  }

  function onAction(level: OrgLevel, index: number, key: string) {
    if (key === "rename") setEditing(level);
    if (key === "up") move(index, -1);
    if (key === "down") move(index, 1);
    if (key === "archive" || key === "restore") {
      run(
        () => setLevelArchived(level.id, key === "archive"),
        t(key === "archive" ? "archivedDone" : "restored", { name: level.name })
      );
    }
  }

  return (
    <section aria-labelledby="levels-title" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h3 id="levels-title" className="text-title-large text-on-surface">
          {t("title")}
        </h3>
        <Button variant="tonal" leadingIcon={<Icon name="add" />} onPress={() => setEditing("new")}>
          {t("add")}
        </Button>
      </header>
      <p className="text-body-medium text-on-surface-variant">
        {levels.length ? t("intro") : t("empty")}
      </p>
      {levels.length > 0 && (
        <List aria-label={t("title")} aria-busy={pending || undefined}>
          {levels.map((level, index) => (
            <ListItem
              key={level.id}
              textValue={level.name}
              leading={
                <span className="text-title-medium text-on-surface-variant">{index + 1}</span>
              }
              supportingText={t("units", {
                count: units.filter((u) => u.levelId === level.id && !u.archived).length,
              })}
              trailing={
                <div className="flex items-center gap-2">
                  {level.archived && <Tag color="neutral">{t("archived")}</Tag>}
                  <MenuTrigger>
                    <IconButton
                      variant="standard"
                      aria-label={t("actions", { name: level.name })}
                      icon={<Icon name="more_vert" />}
                    />
                    <Menu
                      aria-label={t("actions", { name: level.name })}
                      onAction={(key) => onAction(level, index, String(key))}
                    >
                      {[
                        <MenuItem key="rename" leadingIcon={<Icon name="edit" />}>
                          {t("rename")}
                        </MenuItem>,
                        index > 0 && (
                          <MenuItem key="up" leadingIcon={<Icon name="arrow_upward" />}>
                            {t("moveUp")}
                          </MenuItem>
                        ),
                        index < levels.length - 1 && (
                          <MenuItem key="down" leadingIcon={<Icon name="arrow_downward" />}>
                            {t("moveDown")}
                          </MenuItem>
                        ),
                        <MenuItem
                          key={level.archived ? "restore" : "archive"}
                          leadingIcon={<Icon name={level.archived ? "unarchive" : "archive"} />}
                        >
                          {t(level.archived ? "restore" : "archive")}
                        </MenuItem>,
                      ].filter(Boolean)}
                    </Menu>
                  </MenuTrigger>
                </div>
              }
            >
              {level.name}
            </ListItem>
          ))}
        </List>
      )}
      {editing && (
        <LevelDialog
          level={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
