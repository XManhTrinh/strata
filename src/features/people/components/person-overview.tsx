"use client";

import { useFormatter, useTranslations } from "next-intl";
import { IconButton, List, ListItem } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import type { FieldValue, JobRecord, PersonProfile } from "../types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-title-medium text-on-surface px-4">{title}</h2>
      {children}
    </section>
  );
}

/** Details, today's job and custom fields. */
export function PersonOverview({
  person,
  current,
  onEditField,
}: {
  person: PersonProfile;
  current: JobRecord | undefined;
  onEditField: (field: FieldValue) => void;
}) {
  const t = useTranslations("person");
  const format = useFormatter();
  const date = (iso: string | null) =>
    iso
      ? format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "UTC" })
      : t("details.none");
  const canEdit = person.access.includes("people.edit");
  const canEditSensitive = person.access.includes("people.edit_compensation");

  const rows = (label: string, items: [string, string | null | undefined][]) => (
    <List aria-label={label}>
      {items.map(([name, value]) => (
        <ListItem key={name} textValue={`${name} ${value ?? ""}`} overline={name}>
          {value || t("details.none")}
        </ListItem>
      ))}
    </List>
  );

  const fieldText = (field: FieldValue): string => {
    const v = field.value;
    if (v == null) return t("fields.none");
    if (field.type === "date" && typeof v === "string") return date(v);
    if (field.type === "person") return field.personName ?? t("fields.none");
    const label = (id: unknown) => field.options.find((o) => o.id === id)?.label ?? "";
    if (field.type === "single_choice") return label(v);
    if (field.type === "multi_choice" && Array.isArray(v)) return v.map(label).join(", ");
    return String(v);
  };

  return (
    <div className="expanded:grid-cols-2 grid gap-6">
      <Section title={t("jobRecord.title")}>
        {current ? (
          rows(t("jobRecord.title"), [
            [t("jobRecord.unit"), current.unitName],
            [t("jobRecord.manager"), current.managerName],
            [t("jobRecord.position"), current.positionName],
            [t("jobRecord.level"), current.careerLevelName],
            [t("jobRecord.employmentType"), current.employmentTypeName],
          ])
        ) : (
          <p className="text-body-medium text-on-surface-variant px-4">{t("noJob")}</p>
        )}
      </Section>
      <Section title={t("details.title")}>
        {rows(t("details.title"), [
          [t("details.email"), person.email],
          [t("details.personKey"), person.personKey],
          [t("details.startDate"), date(person.startDate)],
          [t("details.endDate"), date(person.endDate)],
        ])}
      </Section>
      {person.fields.length > 0 && (
        <Section title={t("fields.title")}>
          <List aria-label={t("fields.title")}>
            {person.fields.map((field) => (
              <ListItem
                key={field.fieldId}
                textValue={`${field.label} ${fieldText(field)}`}
                overline={field.label}
                trailing={
                  (field.sensitive ? canEditSensitive : canEdit) && (
                    <IconButton
                      variant="standard"
                      aria-label={t("fields.edit", { name: field.label })}
                      icon={<Icon name="edit" />}
                      onPress={() => onEditField(field)}
                    />
                  )
                }
              >
                {fieldText(field)}
              </ListItem>
            ))}
          </List>
        </Section>
      )}
    </div>
  );
}
