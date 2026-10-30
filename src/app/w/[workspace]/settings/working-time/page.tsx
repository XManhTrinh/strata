import { requireSettingsSection } from "@/features/settings/require-section";
import { WorkingTimeSettings } from "@/features/time/components/working-time-settings";
import { libraryCountries } from "@/features/time/holidays";
import { listHolidays, listTimeSettings } from "@/features/time/queries";

export default async function WorkingTimePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ calendar?: string; year?: string }>;
}) {
  const { workspace: slug } = await params;
  const query = await searchParams;
  const { schedules, calendars } = await listTimeSettings(
    await requireSettingsSection(slug, "working-time")
  );
  // The chosen calendar, else the default; the chosen year, else this one.
  const selected =
    calendars.find((c) => c.id === query.calendar) ??
    calendars.find((c) => c.isDefault) ??
    calendars[0];
  const thisYear = new Date().getFullYear();
  const asked = Number.parseInt(query.year ?? "", 10);
  const year = asked >= thisYear - 5 && asked <= thisYear + 5 ? asked : thisYear;
  const countries = libraryCountries()
    .map((c) => ({ code: c.code, name: c.name, regions: c.regions }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <WorkingTimeSettings
      schedules={schedules}
      calendars={calendars}
      countries={countries}
      selectedId={selected?.id ?? null}
      year={year}
      holidays={selected ? await listHolidays(selected.id, year) : []}
    />
  );
}
