"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Tab, Tabs } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { IsoDateField } from "@/components/ui/iso-date-field";
import { PersonPicker } from "@/features/people/components/person-picker";
import type { OrgLevel, OrgUnit } from "@/features/structure/types";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import type { ChartPerson, ChartSlice, UnitCount } from "../types";
import { ChartCanvas } from "./chart-canvas";
import { PersonView } from "./person-view";
import { UnitsView } from "./units-view";

export type ChartQuery = {
  view: "people" | "units";
  asOf: string;
  /** Null: the top of the organization. */
  personId: string | null;
  unitId: string | null;
};

/** The org chart: reporting lines (canvas, or a person view on phones) or units, as of a date. */
export function OrgChartPage({
  query,
  today,
  meId,
  slice,
  units,
  levels,
  counts,
  unitPeople,
}: {
  query: ChartQuery;
  today: string;
  meId: string | null;
  slice: ChartSlice;
  units: OrgUnit[];
  levels: OrgLevel[];
  counts: UnitCount[];
  unitPeople: ChartPerson[];
}) {
  const t = useTranslations("orgChart");
  const router = useRouter();
  const pathname = usePathname();
  const { workspace } = useWorkspace();

  const href = (patch: Partial<ChartQuery>) => {
    const next = { ...query, ...patch };
    const search = new URLSearchParams();
    if (next.view !== "people") search.set("view", next.view);
    if (next.asOf !== today) search.set("date", next.asOf);
    search.set("person", next.personId ?? "top");
    if (next.unitId) search.set("unit", next.unitId);
    return `${pathname}?${search}`;
  };
  const profileHref = (p: ChartPerson) => `/w/${workspace.slug}/people/${p.id}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          variant="secondary"
          align="start"
          aria-label={t("views.label")}
          value={query.view}
          onChange={(key) => router.push(href({ view: key as ChartQuery["view"] }))}
        >
          <Tab key="people" title={t("views.people")} />
          <Tab key="units" title={t("views.units")} />
        </Tabs>
        <div className="medium:w-48 w-full">
          <IsoDateField
            name="asOf"
            label={t("asOf")}
            defaultValue={query.asOf}
            onChange={(date) => date && router.push(href({ asOf: date }))}
          />
        </div>
        {query.view === "people" && (
          <>
            <div className="medium:w-64 w-full">
              <PersonPicker
                variant="outlined"
                name="find"
                label={t("find")}
                defaultValue={null}
                onSelect={(person) => router.push(href({ personId: person.id }))}
              />
            </div>
            {meId && (
              <Button
                variant="text"
                leadingIcon={<Icon name="person" />}
                href={href({ personId: meId })}
              >
                {t("me")}
              </Button>
            )}
            <Button
              variant="text"
              leadingIcon={<Icon name="vertical_align_top" />}
              href={href({ personId: null })}
            >
              {t("top")}
            </Button>
          </>
        )}
      </div>

      {slice.truncated && (
        <p className="text-body-medium text-on-surface-variant">{t("truncated")}</p>
      )}

      {query.view === "units" ? (
        <UnitsView
          units={units}
          levels={levels}
          counts={counts}
          selectedUnitId={query.unitId}
          people={unitPeople}
          unitHref={(unitId) => href({ unitId })}
          profileHref={profileHref}
        />
      ) : slice.people.length === 0 ? (
        <EmptyState
          titleAs="h2"
          icon={<Icon name="account_tree" />}
          title={t("empty")}
          description={t("emptyHint")}
        />
      ) : (
        <>
          <div className="medium:block hidden h-[calc(100dvh-14rem)] min-h-96">
            <ChartCanvas
              // A new start or date starts the chart afresh.
              key={`${query.personId}|${query.asOf}`}
              slice={slice}
              asOf={query.asOf}
              startId={query.personId}
              onFocus={(person) => router.push(href({ personId: person.id }))}
            />
          </div>
          <div className="medium:hidden">
            <PersonView
              people={slice.people}
              startId={query.personId}
              hrefFor={(person) => href({ personId: person.id })}
              profileHref={profileHref}
            />
          </div>
        </>
      )}
    </div>
  );
}
