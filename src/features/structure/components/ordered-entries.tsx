"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { List, ListItem } from "@windmorph/react";
import { Tag } from "@windmorph/react-pro";
import { reorderJobEntries, setJobEntryArchived } from "../job-actions";
import { useRunAction } from "../use-run-action";
import { ItemMenu } from "./item-menu";

type Entry = { id: string; name: string; archived: boolean };

/** An ordered list of career levels or employment types, each with edit, move and archive. */
export function OrderedEntries<E extends Entry>({
  label,
  table,
  entries,
  supportingText,
  onEdit,
}: {
  label: string;
  table: "career_levels" | "employment_types";
  entries: E[];
  supportingText?: (entry: E) => ReactNode;
  onEdit: (entry: E) => void;
}) {
  const t = useTranslations("jobs");
  const [run, pending] = useRunAction();

  function onAction(entry: E, index: number, key: string) {
    if (key === "edit") onEdit(entry);
    if (key === "up" || key === "down") {
      const ids = entries.map((e) => e.id);
      const other = index + (key === "up" ? -1 : 1);
      [ids[index], ids[other]] = [ids[other]!, ids[index]!];
      run(() => reorderJobEntries(table, ids), t("reordered"));
    }
    if (key === "archive" || key === "restore") {
      run(
        () => setJobEntryArchived(table, entry.id, key === "archive"),
        t(key === "archive" ? "archivedDone" : "restored", { name: entry.name })
      );
    }
  }

  return (
    <List aria-label={label} aria-busy={pending || undefined}>
      {entries.map((entry, index) => (
        <ListItem
          key={entry.id}
          textValue={entry.name}
          supportingText={supportingText?.(entry)}
          trailing={
            <div className="flex items-center gap-2">
              {entry.archived && <Tag color="neutral">{t("archived")}</Tag>}
              <ItemMenu
                label={t("actions", { name: entry.name })}
                onAction={(key) => onAction(entry, index, key)}
                actions={[
                  { key: "edit", label: t("edit"), icon: "edit" },
                  index > 0 && { key: "up", label: t("moveUp"), icon: "arrow_upward" },
                  index < entries.length - 1 && {
                    key: "down",
                    label: t("moveDown"),
                    icon: "arrow_downward",
                  },
                  entry.archived
                    ? { key: "restore", label: t("restore"), icon: "unarchive" }
                    : { key: "archive", label: t("archive"), icon: "archive" },
                ]}
              />
            </div>
          }
        >
          {entry.name}
        </ListItem>
      ))}
    </List>
  );
}
