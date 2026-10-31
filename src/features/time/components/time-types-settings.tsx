"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { OrderedEntries } from "@/features/structure/components/ordered-entries";
import type { RoleChoice, TimeType } from "../types";
import { TimeTypeDialog } from "./time-type-dialog";

export function TimeTypesSettings({ types, roles }: { types: TimeType[]; roles: RoleChoice[] }) {
  const t = useTranslations("timeSettings");
  const [editing, setEditing] = useState<TimeType | "new" | null>(null);

  const summary = (type: TimeType) =>
    [
      type.usesAllowance && t("types.summaryAllowance"),
      type.needsApproval &&
        t("types.summaryApproval", { approver: t(`types.approvers.${type.approver}`) }),
      type.isAway && t("types.summaryAway"),
      t(`types.visibilities.${type.visibility}`),
      type.allowsRecurrence && t("types.summaryRepeats"),
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <section aria-labelledby="time-types-title" className="max-w-form flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="time-types-title" className="text-headline-small text-on-surface">
          {t("types.title")}
        </h2>
        <Button
          variant="filled"
          leadingIcon={<Icon name="add" />}
          onPress={() => setEditing("new")}
        >
          {t("types.add")}
        </Button>
      </header>
      <p className="text-body-medium text-on-surface-variant">{t("types.intro")}</p>
      <OrderedEntries
        label={t("types.title")}
        table="time_types"
        entries={types}
        supportingText={summary}
        onEdit={setEditing}
      />
      {editing && (
        <TimeTypeDialog
          type={editing === "new" ? undefined : editing}
          roles={roles}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
