"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, List, ListItem } from "@windmorph/react";
import { Avatar } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { TreeView } from "@/components/ui/tree-view";
import { buildTree } from "@/features/structure/hierarchy";
import type { OrgLevel, OrgUnit } from "@/features/structure/types";
import type { ChartPerson, OpenRole, UnitCount } from "../types";

/** The unit tree with headcounts on the date; a unit's people beside it. */
export function UnitsView({
  units,
  levels,
  counts,
  selectedUnitId,
  people,
  openRoles,
  unitHref,
  profileHref,
}: {
  units: OrgUnit[];
  levels: OrgLevel[];
  counts: UnitCount[];
  selectedUnitId: string | null;
  people: ChartPerson[];
  openRoles: OpenRole[];
  unitHref: (unitId: string) => string;
  profileHref: (person: ChartPerson) => string;
}) {
  const t = useTranslations("orgChart");
  const tree = buildTree(units, false);
  const format = useFormatter();
  const count = new Map(counts.map((c) => [c.id, c]));
  const open = new Map<string, OpenRole[]>();
  for (const role of openRoles) open.set(role.unitId, [...(open.get(role.unitId) ?? []), role]);
  const level = new Map(levels.map((l) => [l.id, l.name]));
  const [expanded, setExpanded] = useState<Set<string | number>>(
    () => new Set(tree.map((n) => n.id))
  );
  const selected = units.find((u) => u.id === selectedUnitId);

  return (
    <div className="expanded:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] grid gap-6">
      <TreeView
        aria-label={t("views.units")}
        items={tree}
        textValue={(u) => u.name}
        expandedKeys={expanded}
        onExpandedChange={setExpanded}
        dependencies={[counts, selectedUnitId]}
      >
        {(unit) => {
          const c = count.get(unit.id);
          return (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{unit.name}</span>
                <span className="text-body-small text-on-surface-variant truncate">
                  {[
                    unit.levelId && level.get(unit.levelId),
                    t("unitCount", { direct: c?.direct ?? 0, total: c?.total ?? 0 }),
                    open.has(unit.id) && t("openRoles", { count: open.get(unit.id)!.length }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <Button
                variant={unit.id === selectedUnitId ? "tonal" : "text"}
                href={unitHref(unit.id)}
                // The name includes the count shown, so speech and sight match.
                aria-label={t("unitPeopleButton", { count: c?.direct ?? 0, unit: unit.name })}
              >
                {c?.direct ?? 0}
              </Button>
            </>
          );
        }}
      </TreeView>
      <section className="flex flex-col gap-2">
        {selected ? (
          <>
            <h2 className="text-title-medium text-on-surface px-4">
              {t("unitPeople", { unit: selected.name })}
            </h2>
            <List aria-label={t("unitPeople", { unit: selected.name })}>
              {people.map((p) => (
                <ListItem
                  key={p.id}
                  href={profileHref(p)}
                  textValue={p.name}
                  leading={
                    <Avatar name={p.name} src={p.avatarUrl ?? undefined} size="sm" decorative />
                  }
                  supportingText={p.position ?? undefined}
                >
                  {p.name}
                </ListItem>
              ))}
            </List>
            {open.has(selected.id) && (
              <>
                <h3 className="text-title-small text-on-surface-variant px-4 pt-2">
                  {t("openRolesIn", { unit: selected.name })}
                </h3>
                <List aria-label={t("openRolesIn", { unit: selected.name })}>
                  {open.get(selected.id)!.map((role) => (
                    <ListItem
                      key={role.id}
                      textValue={role.title}
                      leading={<Icon name="person_search" />}
                      supportingText={t("openRoleDetail", {
                        date: format.dateTime(new Date(`${role.startDate}T00:00:00Z`), {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        }),
                        fte: role.fte,
                      })}
                    >
                      {role.title}
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </>
        ) : (
          <p className="text-body-medium text-on-surface-variant px-4">{t("chooseUnit")}</p>
        )}
      </section>
    </div>
  );
}
