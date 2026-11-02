"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Button, List, ListItem, Select, SelectItem, Switch, TextField } from "@windmorph/react";
import { Tag } from "@windmorph/react-pro";
import { FormDialog } from "@/components/ui/form-dialog";
import { Icon } from "@/components/ui/icon";
import { IsoDateField } from "@/components/ui/iso-date-field";
import { ItemMenu } from "@/components/ui/item-menu";
import { setEntryArchived } from "@/features/structure/entry-actions";
import { useRunAction } from "@/features/structure/use-run-action";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import {
  deleteHoliday,
  generateCalendarYear,
  saveCalendar,
  saveHoliday,
  setTimeDefault,
} from "../settings-actions";
import type { Holiday, HolidayCalendar } from "../types";

export type CountryChoice = { code: string; name: string; regions: Record<string, string> };

/** Holiday calendars, and the selected one's holidays for a year (both kept in the URL). */
export function CalendarsSection({
  calendars,
  countries,
  selectedId,
  year,
  holidays,
}: {
  calendars: HolidayCalendar[];
  countries: CountryChoice[];
  selectedId: string | null;
  year: number;
  holidays: Holiday[];
}) {
  const t = useTranslations("timeSettings");
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const { workspace } = useWorkspace();
  const [run, pending] = useRunAction();
  const [editing, setEditing] = useState<HolidayCalendar | "new" | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | "new" | null>(null);
  const [country, setCountry] = useState(countries.find((c) => c.code === "GB")?.code ?? "");
  const [half, setHalf] = useState(false);
  const selected = calendars.find((c) => c.id === selectedId);
  const thisYear = new Date().getFullYear();
  const go = (calendarId: string, y: number) =>
    router.push(`${pathname}?calendar=${calendarId}&year=${y}`, { scroll: false });
  const calendar = editing === "new" ? null : editing;
  const holiday = editingHoliday === "new" ? null : editingHoliday;

  return (
    <section aria-labelledby="calendars-title" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="calendars-title" className="text-title-large text-on-surface">
          {t("calendars.title")}
        </h2>
        <Button variant="tonal" leadingIcon={<Icon name="add" />} onPress={() => setEditing("new")}>
          {t("calendars.add")}
        </Button>
      </header>
      <p className="text-body-medium text-on-surface-variant">{t("calendars.intro")}</p>
      <List
        aria-label={t("calendars.title")}
        // A row opens its holidays (not a selection, so rows can hold their menu).
        onAction={(key) => go(String(key), year)}
      >
        {calendars.map((c) => (
          <ListItem
            key={c.id}
            textValue={c.name}
            leading={<Icon name={c.id === selectedId ? "check_circle" : "calendar_month"} />}
            supportingText={[
              c.lastYear
                ? t("calendars.reaches", { year: c.lastYear })
                : t("calendars.reachesNone"),
              c.source === "generated" && (c.lastYear ?? 0) <= thisYear && t("calendars.soon"),
            ]
              .filter(Boolean)
              .join(" · ")}
            trailing={
              <div className="flex items-center gap-2">
                {c.isDefault && <Tag color="primary">{t("default")}</Tag>}
                {c.archived && <Tag color="neutral">{t("archived")}</Tag>}
                <ItemMenu
                  label={t("actions", { name: c.name })}
                  onAction={(key) => {
                    if (key === "edit") setEditing(c);
                    if (key === "default")
                      run(
                        () => setTimeDefault("holiday_calendars", c.id),
                        t("defaultSet", { name: c.name })
                      );
                    if (key === "archive" || key === "restore")
                      run(
                        () => setEntryArchived("holiday_calendars", c.id, key === "archive"),
                        t(key === "archive" ? "archivedDone" : "restored", { name: c.name })
                      );
                  }}
                  actions={[
                    { key: "edit", label: t("edit"), icon: "edit" },
                    !c.isDefault &&
                      !c.archived && { key: "default", label: t("makeDefault"), icon: "star" },
                    !c.isDefault &&
                      (c.archived
                        ? { key: "restore", label: t("restore"), icon: "unarchive" }
                        : { key: "archive", label: t("archive"), icon: "archive" }),
                  ]}
                />
              </div>
            }
          >
            {c.name}
          </ListItem>
        ))}
      </List>

      {selected && (
        <section
          aria-labelledby="holidays-title"
          className="bg-surface-container-low flex flex-col gap-3 rounded-xl p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="holidays-title" className="text-title-medium text-on-surface">
              {t("calendars.holidaysOf", { calendar: selected.name, year })}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                className="w-32"
                label={t("calendars.year")}
                value={String(year)}
                onChange={(key) => key != null && go(selected.id, Number(key))}
              >
                {[thisYear - 1, thisYear, thisYear + 1, thisYear + 2, thisYear + 3].map((y) => (
                  <SelectItem key={String(y)}>{String(y)}</SelectItem>
                ))}
              </Select>
              {selected.source === "generated" && (
                <Button
                  variant="text"
                  pending={pending}
                  onPress={() =>
                    run(
                      () => generateCalendarYear(selected.id, year),
                      t("calendars.generated", { year })
                    )
                  }
                >
                  {t("calendars.generate", { year })}
                </Button>
              )}
              <Button
                variant="tonal"
                leadingIcon={<Icon name="add" />}
                onPress={() => {
                  setHalf(false);
                  setEditingHoliday("new");
                }}
              >
                {t("calendars.addHoliday")}
              </Button>
            </div>
          </div>
          {holidays.length === 0 ? (
            <p className="text-body-medium text-on-surface-variant">{t("calendars.noHolidays")}</p>
          ) : (
            <List aria-label={t("calendars.holidays", { year })}>
              {holidays.map((h) => (
                <ListItem
                  key={h.id}
                  textValue={h.name}
                  overline={format.dateTime(new Date(h.date), {
                    dateStyle: "full",
                    timeZone: "UTC",
                  })}
                  trailing={
                    <div className="flex items-center gap-2">
                      {h.portion < 1 && <Tag color="neutral">{t("calendars.halfDay")}</Tag>}
                      {h.edited && <Tag color="neutral">{t("calendars.edited")}</Tag>}
                      <ItemMenu
                        label={t("actions", { name: h.name })}
                        onAction={(key) => {
                          if (key === "edit") {
                            setHalf(h.portion < 1);
                            setEditingHoliday(h);
                          }
                          if (key === "delete")
                            run(
                              () => deleteHoliday(h.id),
                              t("calendars.removed", { name: h.name })
                            );
                        }}
                        actions={[
                          { key: "edit", label: t("edit"), icon: "edit" },
                          {
                            key: "delete",
                            label: t("calendars.deleteHoliday", { name: h.name }),
                            icon: "delete",
                          },
                        ]}
                      />
                    </div>
                  }
                >
                  {h.name}
                </ListItem>
              ))}
            </List>
          )}
        </section>
      )}

      {editing && (
        <FormDialog
          title={t(calendar ? "calendars.dialogEdit" : "calendars.dialogAdd")}
          submitLabel={t(calendar ? "save" : "add")}
          action={saveCalendar.bind(null, workspace.id, calendar?.id ?? null)}
          done={(name) => t(calendar ? "saved" : "added", { name })}
          onClose={() => setEditing(null)}
        >
          {(fieldError) => (
            <>
              <TextField
                className="w-full"
                name="name"
                label={t("name")}
                required
                defaultValue={calendar?.name ?? ""}
                invalid={Boolean(fieldError("name"))}
                errorMessage={fieldError("name")}
              />
              {!calendar && (
                <>
                  <Select
                    className="w-full"
                    name="country"
                    label={t("calendars.country")}
                    searchable
                    labels={{ search: t("calendars.country") }}
                    value={country}
                    onChange={(key) => key != null && setCountry(String(key))}
                  >
                    {[{ code: "", name: t("calendars.custom"), regions: {} }, ...countries].map(
                      (c) => (
                        <SelectItem key={c.code || "custom"} textValue={c.name}>
                          {c.name}
                        </SelectItem>
                      )
                    )}
                  </Select>
                  {Object.keys(countries.find((c) => c.code === country)?.regions ?? {}).length >
                    0 && (
                    <Select
                      searchable={
                        Object.keys(countries.find((c) => c.code === country)?.regions ?? {})
                          .length +
                          1 >
                        7
                      }
                      labels={{ search: t("calendars.region") }}
                      className="w-full"
                      name="region"
                      label={t("calendars.region")}
                      defaultValue="all"
                    >
                      {[
                        ["all", t("calendars.regionAll")],
                        ...Object.entries(countries.find((c) => c.code === country)!.regions),
                      ].map(([code, name]) => (
                        <SelectItem key={code}>{name}</SelectItem>
                      ))}
                    </Select>
                  )}
                </>
              )}
            </>
          )}
        </FormDialog>
      )}

      {editingHoliday && selected && (
        <FormDialog
          title={t(holiday ? "calendars.editHoliday" : "calendars.addHoliday")}
          submitLabel={t(holiday ? "save" : "add")}
          action={saveHoliday.bind(null, workspace.id, selected.id, holiday?.id ?? null)}
          done={(name) => t(holiday ? "saved" : "added", { name })}
          onClose={() => setEditingHoliday(null)}
        >
          {(fieldError) => (
            <>
              <IsoDateField
                name="date"
                label={t("calendars.date")}
                // Today when looking at this year, else the year's first day.
                defaultValue={
                  holiday?.date ??
                  (year === thisYear ? new Date().toISOString().slice(0, 10) : `${year}-01-01`)
                }
                required
                errorMessage={fieldError("date")}
              />
              <TextField
                className="w-full"
                name="name"
                label={t("calendars.holidayName")}
                required
                defaultValue={holiday?.name ?? ""}
                invalid={Boolean(fieldError("name"))}
                errorMessage={fieldError("name")}
              />
              <Switch checked={half} onCheckedChange={setHalf}>
                {t("calendars.half")}
              </Switch>
              <input type="hidden" name="half" value={String(half)} />
            </>
          )}
        </FormDialog>
      )}
    </section>
  );
}
