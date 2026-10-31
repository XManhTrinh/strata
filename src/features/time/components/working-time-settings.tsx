"use client";

import { useTranslations } from "next-intl";
import type { Holiday, HolidayCalendar, WorkSchedule } from "../types";
import { CalendarsSection, type CountryChoice } from "./calendars-section";
import { SchedulesSection } from "./schedules-section";

export function WorkingTimeSettings(props: {
  schedules: WorkSchedule[];
  calendars: HolidayCalendar[];
  countries: CountryChoice[];
  selectedId: string | null;
  year: number;
  holidays: Holiday[];
}) {
  const t = useTranslations("settings.sections.working-time");
  return (
    <section aria-labelledby="working-time-title" className="max-w-form flex flex-col gap-8">
      <h2 id="working-time-title" className="text-headline-small text-on-surface">
        {t("name")}
      </h2>
      <SchedulesSection schedules={props.schedules} />
      <CalendarsSection
        calendars={props.calendars}
        countries={props.countries}
        selectedId={props.selectedId}
        year={props.year}
        holidays={props.holidays}
      />
    </section>
  );
}
