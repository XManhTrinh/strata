"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import type { CustomField } from "../types";
import { FieldDialog } from "./field-dialog";
import { OptionsDialog } from "./options-dialog";
import { OrderedEntries } from "./ordered-entries";

const CHOICE_TYPES = new Set(["single_choice", "multi_choice"]);

export function CustomFieldsSettings({ fields }: { fields: CustomField[] }) {
  const t = useTranslations("fields");
  const [editing, setEditing] = useState<CustomField | "new" | null>(null);
  const [optionsFor, setOptionsFor] = useState<string | null>(null);
  // The open options dialog follows the field as its options change.
  const optionsField = fields.find((f) => f.id === optionsFor);

  const summary = (f: CustomField) =>
    [
      t(`types.${f.type}`),
      CHOICE_TYPES.has(f.type) && f.options.map((o) => o.name).join(", "),
      f.sensitive && t("sensitive"),
      f.required && t("required"),
      f.keepHistory && t("keepHistory"),
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <section aria-labelledby="fields-title" className="flex max-w-3xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="fields-title" className="text-headline-small text-on-surface">
          {t("title")}
        </h2>
        <Button
          variant="filled"
          leadingIcon={<Icon name="add" />}
          onPress={() => setEditing("new")}
        >
          {t("add")}
        </Button>
      </header>
      <p className="text-body-medium text-on-surface-variant">
        {fields.length ? t("intro") : t("empty")}
      </p>
      {fields.length > 0 && (
        <OrderedEntries
          label={t("title")}
          table="custom_fields"
          entries={fields}
          supportingText={summary}
          onEdit={setEditing}
          extraActions={(f) =>
            CHOICE_TYPES.has(f.type)
              ? [
                  {
                    key: "options",
                    label: t("options"),
                    icon: "list",
                    onAction: () => setOptionsFor(f.id),
                  },
                ]
              : []
          }
        />
      )}
      {editing && (
        <FieldDialog
          field={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {optionsField && <OptionsDialog field={optionsField} onClose={() => setOptionsFor(null)} />}
    </section>
  );
}
